import { Fragment } from "react";
import { QuizBar } from "./QuizBar";
import { CORRECT_COLOR, WRONG_COLOR } from "../../../colorPalette";
import { CHECK_SYMBOL, X_SYMBOL } from "../../../constants/layout";

interface Props {
	correct: number;
	wrong: number;
	maxValue: number;
}


// important information regarding the svg's <text></text> element:  
// 1. by default the "x" attribute for the <text></text> element is where the left edge of the text starts
//    to change the meaning of the "x" attribute use the "text-anchor" // https://developer.mozilla.org/en-US/docs/Web/CSS/text-anchor
// 2. the "y" attribute for the <text></text> is not the top !!!, is is the bottom of the text
//    to change the meaning of the "y" attribute use the "dominant-baseline" // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/dominant-baseline

export const QuizBarChart = (props: Props) => {
	const barWidth = 400; // Height of the chart area
	const hasMaxValue = props.maxValue > 0;

	return (
		<svg 
			viewBox="0 0 400 24" 
			fill="blue" 
			width="100%" 
			height="20" 
		>
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

					{/* <text x="10" y={0 * 25 + 19} z="10" style={{ fill: "white", fontSize: 20 }}> */}
					<text 
						z="10" 
						x="0" 
						textAnchor="start"// to change the meaning of the "x" attribute
						y="0"
						dominantBaseline="text-before-edge" // to change the meaning of the "y" attribute
						style={{ fill: "white", fontSize: 20 }}
					>
						&nbsp;{CHECK_SYMBOL} {props.correct} (
						{hasMaxValue ? `${((props.correct / props.maxValue) * 100.0).toFixed(1)}%` : ""})
					</text>
					{/* <text x="190" y={0 * 25 + 19} z="10" style={{ fill: "white", fontSize: 20 }}> */}
					<text 
						z="10" 
						x="50%" 
						textAnchor="middle" // to change the meaning of the "x" attribute
						y="0"
						dominantBaseline="text-before-edge" // to change the meaning of the "y" attribute
						style={{ fill: "white", fontSize: 20 }}
					>
						{hasMaxValue ? `(${props.maxValue - props.correct - props.wrong})` : ""}
					</text>
                    {/* <text
                        x={370 - (props.maxValue - props.correct).toString().length * 10}
                        y={0 * 25 + 19}
                        z="10"
                        style={{ fill: "white", fontSize: 20, textAlign: "right" }}
                    >
                        {props.wrong} {X_SYMBOL}
                    </text> */}
					<text
						z="10"
						x="100%"
						textAnchor="end" // to change the meaning of the "x" attribute
						y="0"
						dominantBaseline="text-before-edge" // to change the meaning of the "y" attribute
						style={{ fill: "white", fontSize: 20 }}
					>
						{props.wrong} {X_SYMBOL}&nbsp;
					</text>
				</Fragment>
			</>
		</svg>
	);
};
