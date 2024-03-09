export const cookie = (name: string): string => {
	const cookies = new Map(
		document.cookie.split(";").map(c => {
			const [k, v] = c.split("=", 2);
			if (!k) {
				return ["", ""];
			} else {
				return [k.trim(), v.trim()];
			}
		})
	);
	return cookies.get(name) ?? "";
};
