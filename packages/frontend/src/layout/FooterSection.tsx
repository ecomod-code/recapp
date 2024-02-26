import pjson from "../../package.json";

export const FOOTER_HEIGHT = 30;

export const FooterSection = () => {
	return (
		<footer>
			<div style={style}>{pjson.version}</div>
		</footer>
	);
};

const style: React.CSSProperties = {
	display: "flex",
	flexDirection: "row-reverse",
};
