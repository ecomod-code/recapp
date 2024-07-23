import { QuizBar } from "./QuizBar";

interface Props {
    data: number;
    maxValue: number;
    color: string;
    symbol: string;
}

export const QuestionBarChart = (props: Props) => {
    const barWidth = 400; // Height of the chart area
    return (
        <svg viewBox="0 0 400 24" fill="blue" width="100%" height="20">
            <QuizBar y={0} width={barWidth} color={"lightgrey"} />
            <QuizBar y={0} width={(props.data / props.maxValue) * barWidth} color={props.color} />
            <text x="10" y={19} z="10" style={{ fill: "white", fontSize: 20 }}>
                {props.data}
            </text>
            <text x="190" y={19} z="10" style={{ fill: "white", fontSize: 20 }}>
                {(Math.round((props.data / props.maxValue) * 1000.0) / 10.0).toFixed(1)} %
            </text>
            <text x="370" y={19} z="10" style={{ fill: "white", fontSize: 20 }}>
                {props.symbol}
            </text>
        </svg>
    );
};
