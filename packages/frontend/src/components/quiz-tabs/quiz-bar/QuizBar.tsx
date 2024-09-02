interface Props {
	y: number;
	width: number;
	color: string;
	right?: boolean;
}

export const QuizBar = (props: Props) => {
	return (
		<rect
			y={props.y}
			height={24}
			x={props.right ? 400 - props.width : undefined}
			width={props.width}
			fill={props.color}
		/>
	);
};
