import { PropsWithChildren } from "react";
import Form from "react-bootstrap/Form";

export const ListGroupContainer = (props: { header?: string } & PropsWithChildren) => {
    return (
        <Form.Group className="card" style={{ marginTop: "0.8rem" }}>
            {props.header ? <div className="card-header bg-body-secondary">{props.header}</div> : null}
            <div className="list-group list-group-flush">{props.children}</div>
        </Form.Group>
    );
};
