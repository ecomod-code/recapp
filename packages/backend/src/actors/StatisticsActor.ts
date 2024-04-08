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
} from "@recapp/models";
import { CollecionSubscription, SubscribableActor } from "./SubscribableActor";
import { ActorRef, ActorSystem } from "ts-actors";
import { Timestamp, Unit, toTimestamp, unit } from "itu-utils";
import { create } from "mutative";
import { v4 } from "uuid";
import { nothing } from "tsmonads";

type State = {
	cache: Map<Id, TextElementStatistics | ChoiceElementStatistics>;
	subscribers: Map<Id, Set<ActorUri>>;
	collectionSubscribers: Map<ActorUri, CollecionSubscription>;
	lastSeen: Map<ActorUri, Timestamp>;
	lastTouched: Map<Id, Timestamp>;
};

type ResultType = Unit | Error | TextElementStatistics | ChoiceElementStatistics | GroupStatistics;

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

	public async receive(from: ActorRef, message: StatisticsActorMessage): Promise<ResultType> {
		const [clientUserRole, clientUserId] = await this.determineRole(from);
		console.debug("STATISTICSACTOR", from.name, message);
		if (typeof message === "string" && message === "SHUTDOWN") {
			this.shutdown();
		}
		try {
			return await StatisticsActorMessages.match<Promise<ResultType>>(message, {
				GetForQuestion: async questionId => {
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
				},
				GetForQuiz: async () => {
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
					};
					stats.forEach(s => {
						quizStats.maximumParticipants = s.maximumParticipants;
						quizStats.answers.push(s.participants);
						if (s.tag === "ChoiceElementStatistics") {
							quizStats.correctAnswers.push(s.passed);
						} else {
							quizStats.correctAnswers.push(s.participants);
						}
					});
					console.log(stats, quizStats);
					return quizStats;
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
					};
					stats.forEach(s => {
						groupStats.maximumParticipants = s.maximumParticipants;
						groupStats.answers.push(s.participants);
						if (s.tag === "ChoiceElementStatistics") {
							groupStats.correctAnswers.push(s.passed);
						} else {
							groupStats.correctAnswers.push(s.participants);
						}
					});
					return groupStats;
				},
				Update: async answer => {
					const existingStats = await this.getEntity(answer.questionId);
					const stats = existingStats.match(
						stat => {
							stat.updated = toTimestamp();
							stat.participants = stat.participants + 1;
							if (answer.tag === "TextAnswer") {
								(stat as TextElementStatistics).answers.push(answer.answer);
							} else {
								if (answer.correct) {
									(stat as ChoiceElementStatistics).passed =
										(stat as ChoiceElementStatistics).passed + 1;
								}
								(stat as ChoiceElementStatistics).answers.map((a, i) =>
									answer.choices[i] ? a + 1 : a
								);
							}
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
									answers: [answer.answer],
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
								return stat;
							}
						}
					);
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
			});
		} catch (e) {
			console.error("QUESTIONACTOR", e);
			throw e;
		}
	}
}
