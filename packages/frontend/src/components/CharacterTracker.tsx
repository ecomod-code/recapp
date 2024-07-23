import Form from "react-bootstrap/Form";

export const CharacterTracker = (props: { value: number; maxValue: number }) => {
    return (
        <Form.Text style={{ fontSize: 10, marginLeft: 6, fontWeight: "bold" }}>
            ( {props.value} / {props.maxValue} )
        </Form.Text>
    );
};
