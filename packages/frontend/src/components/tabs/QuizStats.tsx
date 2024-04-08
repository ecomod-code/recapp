import { useStatefulActor } from "ts-actors-react";
import { maybe, nothing } from "tsmonads";
import { CurrentQuizMessages, CurrentQuizState } from "../../actors/CurrentQuizActor";
import { Button } from "react-bootstrap";

export const QuizStats: React.FC = () => {
	const [mbQuiz, tryActor] = useStatefulActor<CurrentQuizState>("CurrentQuiz");

	return mbQuiz
		.flatMap(q =>
			!!q.quiz.uid
				? maybe({
						groups: q.quiz.groups,
						questions: q.questions,
						quizStats: q.quizStats,
						questionStats: q.questionStats,
					})
				: nothing()
		)
		.match(
			({ groups, questions, quizStats, questionStats }) => {
				if (quizStats) {
					return (
						<>
							<div>{quizStats?.maximumParticipants} Teilnehmende</div>
							{quizStats?.answers?.map((a, i) => {
								const question = questions[i];
								const correct = quizStats.correctAnswers[i];
								return (
									<div key={question.uid}>
										<div>
											Frage {i + 1}: {question.text.slice(0, 80)}
										</div>
										<div>
											{a} Antworten, davon {correct} korrekte. Erfolgsquote{" "}
											{(((correct * 1.0) / a) * 100.0).toFixed(2)} %
										</div>
										<Button
											variant="primary"
											onClick={() =>
												tryActor.forEach(actor =>
													actor.send(
														actor,
														CurrentQuizMessages.ActivateQuestionStats(question.uid)
													)
												)
											}
										>
											Details
										</Button>
									</div>
								);
							})}
						</>
					);
				}
				if (questionStats) {
					const question = questions.find(q => q.uid === questionStats.questionId)!;
					return (
						<div>
							<div>Frage {question.text.slice(0, 50)}</div>
							<div>
								{questionStats.participants} Teilnehmende von {questionStats.maximumParticipants} (
								{((questionStats.participants / questionStats.maximumParticipants) * 100.0).toFixed(2)}{" "}
								%) haben die Frage beantwortet.
							</div>
							<div>
								{question.type === "TEXT" &&
									questionStats.answers.map((a, i) => <div key={`${a}-${i}`}>{a}</div>)}
								{question.type !== "TEXT" &&
									question.answers.map(({ text, correct }, i) => (
										<div key={text}>
											{text} {correct ? "(RICHTIG)" : "(FALSCH)"} {questionStats.answers[i]}
										</div>
									))}
							</div>
							<Button
								variant="primary"
								onClick={() =>
									tryActor.forEach(actor =>
										actor.send(actor, CurrentQuizMessages.ActivateQuizStats())
									)
								}
							>
								Zurück zum Quiz
							</Button>
						</div>
					);
				}
			},
			() => null
		);
};
