import { Fragment } from "react";
import { QuizBar } from "./QuizBar";
import { CORRECT_COLOR, WRONG_COLOR } from "../../../constants/layout";

interface Props {
    data: number[];
    maxValue: number;
}

export const QuizBarChart = (props: Props) => {
    const barWidth = 400; // Height of the chart area
    const hasMaxValue = props.maxValue > 0;

    return (
        <svg viewBox="0 0 400 24" fill="blue" width="100%" height="20">
            <>
                {props.data.map((value, index) => {
                    return (
                        <Fragment key={index}>
                            <QuizBar y={index * 25} width={barWidth} color={hasMaxValue ? WRONG_COLOR : "grey"} />
                            {hasMaxValue ? (
                                <QuizBar
                                    y={index * 25}
                                    width={(value / props.maxValue) * barWidth}
                                    color={CORRECT_COLOR}
                                />
                            ) : null}
                            <text x="10" y={index * 25 + 19} z="10" style={{ fill: "white", fontSize: 20 }}>
                                {"\u2713"} {value}
                            </text>
                            <text x="170" y={index * 25 + 19} z="10" style={{ fill: "white", fontSize: 20 }}>
                                {hasMaxValue ? `${((value / props.maxValue) * 100.0).toFixed(1)}%` : ""}
                            </text>
                            <text
                                x={370 - (props.maxValue - value).toString().length * 10}
                                y={index * 25 + 19}
                                z="10"
                                style={{ fill: "white", fontSize: 20, textAlign: "right" }}
                            >
                                {props.maxValue - value} {"\u2717"}
                            </text>
                        </Fragment>
                    );
                })}
            </>
        </svg>
    );
};
