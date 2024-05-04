import { useState } from "react";
// import { i18n } from "@lingui/core";
import MDEditor, { commands } from "@uiw/react-md-editor";
// import { last } from "rambda";
import "katex/dist/katex.css";

import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Form from "react-bootstrap/Form";
import { useRendered } from "../../hooks/useRendered";
// import { PersonRaisedHand } from "react-bootstrap-icons";
// import { ButtonWithTooltip } from "../ButtonWithTooltip";
import { CurrentQuizState } from "../../actors/CurrentQuizActor";
import { Id, toId } from "@recapp/models";
// import { MessageModal } from "../modals/MessageModal";
import { isMultiChoiceAnsweredCorrectly } from "../../utils";
import { Trans } from "@lingui/react";

export const RunningQuizTab: React.FC<{
	quizState: CurrentQuizState;
	logQuestion: (questionId: Id, answer: string | boolean[]) => void;
}> = ({ quizState, logQuestion }) => {
	const [answered, setAnswered] = useState(false);
	// const [correct, setCorrect] = useState(false);
	const [textAnswer, setTextAnswer] = useState("");
	const [answers, setAnswers] = useState<boolean[]>([]);
	const { run, questions: qData } = quizState;
	console.log(
		"QUES",
		quizState.questions.length,
		"RUN",
		quizState.run,
		"ENTRY",
		quizState.run?.counter,
		"FOO",
		quizState.questions[0]
	);

	const questions = run?.questions.map(id => qData.find(q => q.uid === id)) ?? [];
	const currentQuestion = questions[run?.counter ?? 0];
	const questionText = questions.at(run?.counter ?? 0)?.text;
	const { rendered } = useRendered({ value: questionText ?? "" });

	// useEffect(() => {
	//     setCorrect(last(quizState.run?.correct ?? []) ?? false);
	// }, [quizState.run?.correct.length]);

	if (!quizState.run || !quizState.questions) {
		return null;
	}

	const isQuestionTypeText = currentQuestion?.type === "TEXT";
	const isQuestionTypeSingle = currentQuestion?.type === "SINGLE";
	// const isQuestionTypeMultiple = currentQuestion?.type === "MULTIPLE";

	const submitAnswer = () => {
		if (isQuestionTypeText) {
			nextQuestion();
		} else {
			setAnswered(true);
		}
	};

	const logQuestionClicked = () => {
		logQuestion(currentQuestion?.uid ?? toId(""), isQuestionTypeText ? textAnswer : answers);
	};

	const nextQuestion = () => {
		logQuestionClicked();

		setAnswered(false);
		setTextAnswer("");
		setAnswers([]);
	};

	const updateAnswer = (index: number, value: boolean) => {
		const answersCopy = isQuestionTypeSingle ? answers.map(() => false) : [...answers];
		if (answersCopy.length === 0) {
			const a = new Array(currentQuestion?.answers.length).map(() => false);
			a[index] = value;
			console.log("ANSWERS NEW", a);
			setAnswers(a);
		} else {
			const a = answersCopy;
			a[index] = value;
			console.log("ANSWERS", a);
			setAnswers(a);
		}
	};

	const isAnsweredCorrectly = !isQuestionTypeText ? isMultiChoiceAnsweredCorrectly(answers, currentQuestion) : true;

	return (
		<Row>
			{/* <MessageModal
                show={answered}
                color={correct ? "green" : "red"}
                titleId={correct ? "answer-correct-title" : "answer-wrong-title"}
                textId={correct ? "answer-correct" : "answer-wrong"}
                onClose={nextQuestion}
            /> */}
			{(run?.counter ?? 0) < questions.length && (
				<Card className="p-0">
					<Card.Header
						className={`text-start d-flex flex-row ${!isQuestionTypeText && answered ? (isAnsweredCorrectly ? "bg-success" : "bg-danger") : ""}`}
					>
						<div className="m-1 align-self-center">
							{/* <strong>Frage {(run?.counter ?? 0) + 1}</strong> */}
							<strong>
								Frage {(run?.counter ?? 0) + 1} / {run?.questions.length}
							</strong>
						</div>
					</Card.Header>
					<Card.Body>
						<div className="p-2 text-start h-30" dangerouslySetInnerHTML={{ __html: rendered }} />
					</Card.Body>
					<Card.Footer>
						{!isQuestionTypeText && (
							<Form className="text-start mb-2">
								{currentQuestion?.answers.map((answer, index) => {
									return (
										<Form.Group key={answer.text} className="d-flex gap-2">
											<Form.Check
												name="answer"
												disabled={answered}
												type={isQuestionTypeSingle ? "radio" : "checkbox"}
												onChange={event => updateAnswer(index, event.target.checked)}
											/>
											<Form.Label
												className={
													answered ? (answer.correct ? "text-success" : "text-danger") : ""
												}
											>
												{answer.text}
											</Form.Label>
										</Form.Group>
									);
								})}
							</Form>
						)}
						{isQuestionTypeText && (
							<div className="d-flex flex-column flex-grow-1">
								<div data-color-mode="light">
									<MDEditor
										commands={[
											commands.bold,
											commands.italic,
											commands.strikethrough,
											commands.divider,
											commands.link,
											commands.quote,
											commands.code,
											commands.divider,
											commands.unorderedListCommand,
											commands.orderedListCommand,
											commands.checkedListCommand,
											commands.divider,
											commands.help,
										]}
										extraCommands={[]}
										value={textAnswer}
										onChange={val => setTextAnswer(val ?? "")}
										height="100%"
										// eslint-disable-next-line @typescript-eslint/no-unused-vars
										components={{ preview: (_source, _state, _dispath) => <></> }}
										preview="edit"
									/>
								</div>
							</div>
						)}

						<div className="mt-2 d-flex justify-content-between">
							<Button disabled={answered} onClick={submitAnswer}>
								Abschließen
							</Button>
							{answered && (
								<Button disabled={!answered} onClick={nextQuestion}>
									<Trans id="question-stats-next-question-button" />
								</Button>
							)}
						</div>
					</Card.Footer>
				</Card>
			)}
			{(run?.counter ?? 0) === questions.length && (
				<Card className="p-0">
					<Card.Header className="text-start d-flex flex-row">
						<div className="align-self-center">
							<strong>Quiz abgeschlossen</strong>
						</div>
						<div className="flex-grow-1"></div>
					</Card.Header>
					<Card.Body>
						<div className="p-2 text-start h-30">
							{questions.length} Fragen beantwortet. Davon {run?.correct.filter(Boolean).length ?? 0}{" "}
							richtige Antworten.
						</div>
						`
					</Card.Body>
					<Card.Footer>&nbsp;</Card.Footer>
				</Card>
			)}
		</Row>
	);
};
