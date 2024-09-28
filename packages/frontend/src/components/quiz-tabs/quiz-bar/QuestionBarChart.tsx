import { QuizBar } from "./QuizBar";

interface Props {
    data: number;
    maxValue: number;
    color: string;
    symbol: string;
}

// important information regarding the svg's <text></text> element:  
// 1. by default the "x" attribute for the <text></text> element is where the left edge of the text starts
//    to change the meaning of the "x" attribute use the "text-anchor" // https://developer.mozilla.org/en-US/docs/Web/CSS/text-anchor
// 2. the "y" attribute for the <text></text> is not the top !!!, is is the bottom of the text
//    to change the meaning of the "y" attribute use the "dominant-baseline" // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/dominant-baseline

export const QuestionBarChart = (props: Props) => {
    const barWidth = 400; // Height of the chart area
    return (
        <svg viewBox="0 0 400 24" fill="blue" width="100%" height="20">
            <QuizBar y={0} width={barWidth} color={"lightgrey"} />
            <QuizBar y={0} width={(props.data / props.maxValue) * barWidth} color={props.color} />
            {/* <text x="10" y={19} z="10" style={{ fill: "white", fontSize: 20 }}> */}
            <text
                z="10"
                x="0"
                textAnchor="start" // to change the meaning of the "x" attribute
                y="0"
                dominantBaseline="text-before-edge" // to change the meaning of the "y" attribute
                style={{ fill: "white", fontSize: 20 }}
            >
                &nbsp;{props.data}
            </text>
            {/* <text x="190" y={19} z="10" style={{ fill: "white", fontSize: 20 }}> */}
            <text
                z="10"
                x="50%"
                textAnchor="middle" // to change the meaning of the "x" attribute
                y="0"
                dominantBaseline="text-before-edge" // to change the meaning of the "y" attribute
                style={{ fill: "white", fontSize: 20 }}
            >
                {(Math.round((props.data / props.maxValue) * 1000.0) / 10.0).toFixed(1)} %
            </text>
            {/* <text x="370" y={19} z="10" style={{ fill: "white", fontSize: 20 }}> */}
            <text
                z="10"
                x="100%"
                textAnchor="end" // to change the meaning of the "x" attribute
                y="0"
                dominantBaseline="text-before-edge" // to change the meaning of the "y" attribute
                style={{ fill: "white", fontSize: 20 }}
            >
                {props.symbol}&nbsp;
            </text>
        </svg>
    );
};
