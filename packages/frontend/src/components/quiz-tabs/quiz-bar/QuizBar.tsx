interface Props {
    y: number;
    width: number;
    color: string;
}

export const QuizBar = (props: Props) => {
    return <rect y={props.y} height={24} width={props.width} fill={props.color} />;
};
