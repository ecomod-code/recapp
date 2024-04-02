import { useEffect, useState } from "react";
import "katex/dist/katex.css";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { Button, Card, Row, Form } from "react-bootstrap";
import { PersonRaisedHand } from "react-bootstrap-icons";
import { CurrentQuizState } from "../../actors/CurrentQuizActor";
import { MessageModal } from "../modals/MessageModal";
import { Id } from "@recapp/models";
import MDEditor, { commands } from "@uiw/react-md-editor";

export const RunningQuiz: React.FC<{
	quizState: CurrentQuizState;
	logQuestion: (questionId: Id, answer: string | boolean[]) => Promise<boolean>;
}> = ({ quizState, logQuestion }) => {
	const [answered, setAnswered] = useState(false);
	const [rendered, setRendered] = useState<string>("");
	const [correct, setCorrect] = useState(false);
	const [textAnswer, setTextAnswer] = useState("");
	const [answers, setAnswers] = useState<boolean[]>([]);
	const { run, questions } = quizState;
	const questionText = questions[run?.counter ?? 0].text;
	useEffect(() => {
		const f = async () => {
			const result = await unified()
				.use(remarkParse)
				.use(remarkMath)
				.use(remarkRehype)
				.use(rehypeKatex)
				.use(rehypeStringify)
				.process(questionText);
			setRendered(result.toString());
		};
		f();
	}, [questionText]);

	const logQuestionClicked = () => {
		logQuestion(
			questions[run?.counter ?? 0].uid,
			questions[run?.counter ?? 0].type === "TEXT" ? textAnswer : answers
		).then(setCorrect);
		setAnswered(true);
	};

	const nextQuestion = () => {
		setAnswered(false);
		setTextAnswer("");
		setAnswers([]);
	};

	const updateAnswer = (index: number, value: boolean) => {
		if (answers.length === 0) {
			const a = new Array(questions[run?.counter ?? 0].answers.length);
			a[index] = value;
			setAnswers(a);
		} else {
			const a = [...answers];
			a[index] = value;
			setAnswers(a);
		}
	};

	const currentQuestion = questions[run?.counter ?? 0];
	const questionType = questions[run?.counter ?? 0].type;

	return (
		<Row>
			<MessageModal
				show={answered}
				color={correct ? "green" : "red"}
				titleId={correct ? "answer-correct-title" : "answer-wrong-title"}
				textId={correct ? "answer-correct" : "answer-wrong"}
				onClose={nextQuestion}
			/>
			{(run?.counter ?? 0) < questions.length && (
				<Card className="p-0">
					<Card.Header className="text-start d-flex flex-row">
						<div className="align-self-center">
							<strong>Frage {(run?.counter ?? 0) + 1}</strong>
						</div>
						<div className="flex-grow-1"></div>
						<div className="m-1">
							<Button variant="secondary">
								<PersonRaisedHand />
							</Button>
						</div>
					</Card.Header>
					<Card.Body>
						<div className="p-2 text-start h-30" dangerouslySetInnerHTML={{ __html: rendered }} />
					</Card.Body>
					<Card.Footer>
						{questionType !== "TEXT" && (
							<Form className="text-start mb-2">
								{currentQuestion.answers.map((answer, index) => {
									return (
										<Form.Check
											key={answer.text}
											label={answer.text}
											name="answer"
											type={currentQuestion.type === "SINGLE" ? "radio" : "checkbox"}
											onChange={event => updateAnswer(index, event.target.checked)}
										/>
									);
								})}
							</Form>
						)}
						{questionType === "TEXT" && (
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
										onChange={val => val && setTextAnswer(val)}
										height="100%"
										components={{ preview: (_source, _state, _dispath) => <></> }}
										preview="edit"
									/>
								</div>
							</div>
						)}
						<Button onClick={logQuestionClicked}>Abschließen</Button>
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
							{questions.length} Fragen beantwortet. Davon ${run?.correct.filter(Boolean).length ?? 0}{" "}
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
