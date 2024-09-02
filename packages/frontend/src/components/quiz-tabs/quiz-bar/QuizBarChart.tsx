import { Fragment } from "react";
import { QuizBar } from "./QuizBar";
import { CORRECT_COLOR, WRONG_COLOR } from "../../../colorPalette";
import { CHECK_SYMBOL, X_SYMBOL } from "../../../constants/layout";

interface Props {
	correct: number;
	wrong: number;
	maxValue: number;
}

export const QuizBarChart = (props: Props) => {
	const barWidth = 400; // Height of the chart area
	const hasMaxValue = props.maxValue > 0;

	return (
		<svg viewBox="0 0 400 24" fill="blue" width="100%" height="20">
			<>
				<Fragment key={0}>
					<QuizBar y={0 * 25} width={barWidth} color={"grey"} />
					{hasMaxValue ? (
						<QuizBar y={0 * 25} width={(props.correct / props.maxValue) * barWidth} color={CORRECT_COLOR} />
					) : null}
					{hasMaxValue ? (
						<QuizBar
							y={0 * 25}
							right
							width={(props.wrong / props.maxValue) * barWidth}
							color={WRONG_COLOR}
						/>
					) : null}
					<text x="10" y={0 * 25 + 19} z="10" style={{ fill: "white", fontSize: 20 }}>
						{CHECK_SYMBOL} {props.correct} (
						{hasMaxValue ? `${((props.correct / props.maxValue) * 100.0).toFixed(1)}%` : ""})
					</text>
					<text x="190" y={0 * 25 + 19} z="10" style={{ fill: "white", fontSize: 20 }}>
						{hasMaxValue ? `(${props.maxValue - props.correct - props.wrong})` : ""}
					</text>
					<text
						x={370 - (props.maxValue - props.correct).toString().length * 10}
						y={0 * 25 + 19}
						z="10"
						style={{ fill: "white", fontSize: 20, textAlign: "right" }}
					>
						{props.wrong} {X_SYMBOL}
					</text>
				</Fragment>
			</>
		</svg>
	);
};
