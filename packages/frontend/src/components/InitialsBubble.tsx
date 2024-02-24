interface Props {
	username?: string;
}

export const InitialsBubble: React.FC<Props> = (props: Props) => {
	const initials = props.username
		? (props.username[0] + props.username[props.username.lastIndexOf(" ") + 1]).toUpperCase()
		: "";
	return (
		<div className="text-bg-primary d-flex flex-row m-1 justify-content-center" style={style}>
			{initials}
		</div>
	);
};

const style: React.CSSProperties = {
	height: 36,
	width: 36,
	fontWeight: "bold",
	padding: 4,
	fontSize: 18,
	borderRadius: 18,
};
