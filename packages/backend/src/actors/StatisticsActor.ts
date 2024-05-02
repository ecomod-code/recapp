import {
	ActorUri,
	Id,
	toId,
	TextElementStatistics,
	ChoiceElementStatistics,
	StatisticsActorMessage,
	GroupStatistics,
	StatisticsActorMessages,
	StatisticsUpdateMessage,
	StatisticsDeletedMessage,
	Question,
} from "@recapp/models";
import { CollecionSubscription, SubscribableActor } from "./SubscribableActor";
import { ActorRef, ActorSystem } from "ts-actors";
import { Timestamp, Unit, toTimestamp, unit } from "itu-utils";
import { create } from "mutative";
import { v4 } from "uuid";
import { nothing } from "tsmonads";
import * as path from "path";
import { writeFile } from "fs/promises";

type State = {
	cache: Map<Id, TextElementStatistics | ChoiceElementStatistics>;
	subscribers: Map<Id, Set<ActorUri>>;
	collectionSubscribers: Map<ActorUri, CollecionSubscription>;
	lastSeen: Map<ActorUri, Timestamp>;
	lastTouched: Map<Id, Timestamp>;
};

type ResultType = Unit | Error | TextElementStatistics | ChoiceElementStatistics | GroupStatistics | string;

/**
 * Actor representing the comments of a single quiz. This will be started as a child of the corresponding quiz actor
 */
export class StatisticsActor extends SubscribableActor<
	TextElementStatistics | ChoiceElementStatistics,
	StatisticsActorMessage,
	ResultType
> {
	protected override state: State = {
		cache: new Map(),
		subscribers: new Map(),
		collectionSubscribers: new Map(),
		lastSeen: new Map(),
		lastTouched: new Map(),
	};

	protected override updateIndices(_draft: State, _quiz: TextElementStatistics | ChoiceElementStatistics): void {
		return;
	}

	constructor(
		name: string,
		system: ActorSystem,
		private uid: Id
	) {
		super(name, system, "statistics");
	}

	public override async beforeShutdown(): Promise<void> {
		super.beforeShutdown();
	}

	private async getQuizStats() {
		const db = await this.connector.db();
		const stats = await db
			.collection<TextElementStatistics | ChoiceElementStatistics>(this.collectionName)
			.find({ quizId: this.uid })
			.toArray();
		const quizStats: GroupStatistics = {
			groupName: toId(""),
			quizId: this.uid,
			maximumParticipants: 0,
			answers: [],
			correctAnswers: [],
			questionIds: [],
		};
		stats.forEach(s => {
			quizStats.maximumParticipants = Math.max(quizStats.maximumParticipants, s.participants);
			quizStats.answers.push(s.participants);
			quizStats.questionIds.push(s.questionId);
			if (s.tag === "ChoiceElementStatistics") {
				quizStats.correctAnswers.push(s.passed);
			} else {
				quizStats.correctAnswers.push(s.answers.length);
			}
		});
		return quizStats;
	}

	private async getStatsForQuestion(questionId: Id) {
		const db = await this.connector.db();
		const stats = await db
			.collection<TextElementStatistics | ChoiceElementStatistics>(this.collectionName)
			.findOne({ quizId: this.uid, questionId });
		const existingStats = stats ? await this.getEntity(stats.uid) : nothing();
		return existingStats.match<TextElementStatistics | ChoiceElementStatistics>(
			e => e,
			() => ({
				uid: toId(""),
				created: toTimestamp(),
				updated: toTimestamp(),
				questionId: questionId,
				quizId: this.uid,
				groupName: "",
				maximumParticipants: 0,
				participants: 0,
				passed: 0,
				answers: [],
				tag: "ChoiceElementStatistics",
			})
		);
	}

	public async receive(from: ActorRef, message: StatisticsActorMessage): Promise<ResultType> {
		const [clientUserRole, clientUserId] = await this.determineRole(from);
		console.debug("STATISTICSACTOR", from.name, message);
		if (typeof message === "string" && message === "SHUTDOWN") {
			this.shutdown();
		}
		try {
			return await StatisticsActorMessages.match<Promise<ResultType>>(message, {
				GetForQuestion: async questionId => {
					return this.getStatsForQuestion(questionId);
				},
				GetForQuiz: async () => {
					return this.getQuizStats();
				},
				GetForGroup: async groupName => {
					const db = await this.connector.db();
					const stats = await db
						.collection<TextElementStatistics | ChoiceElementStatistics>(this.collectionName)
						.find({ quiz: this.uid, groupName })
						.toArray();
					const groupStats: GroupStatistics = {
						groupName: toId(""),
						quizId: this.uid,
						maximumParticipants: 0,
						answers: [],
						correctAnswers: [],
						questionIds: [],
					};
					stats.forEach(s => {
						groupStats.maximumParticipants = s.maximumParticipants;
						groupStats.answers.push(s.participants);
						groupStats.questionIds.push(s.questionId);
						if (s.tag === "ChoiceElementStatistics") {
							groupStats.correctAnswers.push(s.passed);
						} else {
							groupStats.correctAnswers.push(s.participants);
						}
					});
					return groupStats;
				},
				Update: async answer => {
					const db = await this.connector.db();
					const pre = await db
						.collection<TextElementStatistics | ChoiceElementStatistics>(this.collectionName)
						.findOne({ quizId: this.uid, questionId: answer.questionId });
					const existingStats = pre ? await this.getEntity(pre.uid) : nothing();
					const stats = existingStats.match(
						stat => {
							stat.updated = toTimestamp();
							stat.participants = stat.participants + 1;
							stat.maximumParticipants = Math.max(stat.maximumParticipants, answer.maxParticipants);
							if (answer.tag === "TextAnswer") {
								if (answer.answer) {
									(stat as TextElementStatistics).answers.push(answer.answer);
								}
							} else {
								if (answer.correct) {
									(stat as ChoiceElementStatistics).passed =
										(stat as ChoiceElementStatistics).passed + 1;
								}
								console.log("OLDCHOICES", stat.answers, "NEW CHOICES", answer.choices);
								(stat as ChoiceElementStatistics).answers = (
									stat as ChoiceElementStatistics
								).answers.map((a, i) => (answer.choices[i] ? a + 1 : a));
								console.log("NEWCHOICES", stat.answers);
							}
							console.log("EXISTING CHOICE UPDATE from ", clientUserId);
							return stat;
						},
						() => {
							const uid = toId(v4());
							if (answer.tag === "TextAnswer") {
								const stat: TextElementStatistics = {
									uid,
									tag: "TextElementStatistics",
									created: toTimestamp(),
									updated: toTimestamp(),
									questionId: answer.questionId,
									quizId: this.uid,
									groupName: answer.groupName,
									maximumParticipants: answer.maxParticipants,
									participants: 1,
									answers: answer.answer ? [answer.answer] : [],
								};
								return stat;
							} else {
								const stat: ChoiceElementStatistics = {
									tag: "ChoiceElementStatistics",
									uid,
									created: toTimestamp(),
									updated: toTimestamp(),
									questionId: answer.questionId,
									quizId: this.uid,
									groupName: answer.groupName,
									maximumParticipants: answer.maxParticipants,
									participants: 1,
									passed: answer.correct ? 1 : 0,
									answers: answer.choices.map(c => (c ? 1 : 0)),
								};
								console.log("BRAND new choice from ", clientUserId);
								return stat;
							}
						}
					);
					console.log("STATS", stats);
					this.storeEntity(stats);
					for (const [subscriber] of this.state.collectionSubscribers) {
						this.send(subscriber, new StatisticsUpdateMessage(stats));
					}
					return stats;
				},
				SubscribeToCollection: async () => {
					this.state = create(this.state, draft => {
						draft.lastSeen.set(from.name as ActorUri, toTimestamp());
						draft.collectionSubscribers.set(from.name as ActorUri, {
							properties: [],
							userId: clientUserId,
							userRole: clientUserRole,
						});
					});
					return unit();
				},
				UnsubscribeFromCollection: async () => {
					this.state = create(this.state, draft => {
						draft.collectionSubscribers.delete(from.name as ActorUri);
					});
					return unit();
				},
				Clear: async () => {
					const db = await this.connector.db();
					const result = await db.collection(this.collectionName).deleteMany({ quizId: this.uid });
					console.warn(result);
					this.state.cache = new Map();
					this.state.subscribers.forEach(subscriberSet =>
						subscriberSet.forEach(subscriber =>
							this.send(subscriber, new StatisticsDeletedMessage(this.uid))
						)
					);
					this.state.subscribers = new Map();
					Array.from(this.state.collectionSubscribers.keys()).forEach(subscriber =>
						this.send(subscriber, new StatisticsDeletedMessage(this.uid))
					);
					return unit();
				},
				ExportQuestionStats: async () => {
					const stats: GroupStatistics = await this.getQuizStats();
					const db = await this.connector.db();
					const questions: Question[] = await Promise.all(
						stats.questionIds.map(async id => {
							const question = await db.collection<any>("questions").findOne({ uid: id });
							return question;
						})
					);
					const lines: string[] = [];
					lines.push(
						"question;group;type;maxParticipants;participants;correct;answer1;answer1_count;answer2;answer2_count;answer3;answer3_count;answer4;answer4_count;answer5;answer5_count;answer6;answer6_count"
					);
					await Promise.all(
						questions.map(async (question, index) => {
							if (question) {
								const qstats = await this.getStatsForQuestion(question.uid);
								if (qstats.tag === "TextElementStatistics") {
									lines.push(
										`${question.text.slice(0, 30)};${qstats.groupName};${question.type};${stats.maximumParticipants};${stats.answers[index]};${stats.correctAnswers[index]};` +
											`${qstats.answers[0] ?? ""};${!!qstats.answers[0] ? 1 : 0};` +
											`${qstats.answers[1] ?? ""};${!!qstats.answers[1] ? 1 : 0};` +
											`${qstats.answers[2] ?? ""};${!!qstats.answers[2] ? 1 : 0};` +
											`${qstats.answers[3] ?? ""};${!!qstats.answers[3] ? 1 : 0};` +
											`${qstats.answers[4] ?? ""};${!!qstats.answers[4] ? 1 : 0};` +
											`${qstats.answers[5] ?? ""};${!!qstats.answers[5] ? 1 : 0}`
									);
								} else {
									lines.push(
										`${question.text.slice(0, 30)};${qstats.groupName};${question.type};${stats.maximumParticipants};${stats.answers[index]};${stats.correctAnswers[index]};` +
											`${question.answers[0]?.text ?? ""};${qstats.answers[0] ?? 0};` +
											`${question.answers[1]?.text ?? ""};${qstats.answers[1] ?? 0};` +
											`${question.answers[2]?.text ?? ""};${qstats.answers[2] ?? 0};` +
											`${question.answers[3]?.text ?? ""};${qstats.answers[3] ?? 0};` +
											`${question.answers[4]?.text ?? ""};${qstats.answers[4] ?? 0};` +
											`${question.answers[5]?.text ?? ""};${qstats.answers[5] ?? 0}`
									);
								}
							}
						})
					);

					const exportTime = toTimestamp();
					const filename = `quiz_question_stats_${stats.quizId}_${exportTime.value.toString()}.csv`;

					await writeFile(path.join("./downloads", filename), lines.join("\n"));

					return filename;
				},
				ExportQuizStats: async () => {
					const stats: GroupStatistics = await this.getQuizStats();
					const db = await this.connector.db();
					const questions: Question[] = await Promise.all(
						stats.questionIds.map(async id => {
							const question = await db.collection<any>("questions").findOne({ uid: id });
							return question;
						})
					);
					const lines: string[] = [];
					lines.push("question;type;maxParticipants;participants;correct");
					questions.forEach((question, index) => {
						if (question) {
							lines.push(
								`${question.text.slice(0, 30)};${question.type};${stats.maximumParticipants};${stats.answers[index]};${stats.correctAnswers[index]}`
							);
						}
					});

					const exportTime = toTimestamp();
					const filename = `quiz_stats_${stats.quizId}_${exportTime.value.toString()}.csv`;

					await writeFile(path.join("./downloads", filename), lines.join("\n"));

					return filename;
				},
			});
		} catch (e) {
			console.error("QUESTIONACTOR", e);
			throw e;
		}
	}
}
