import { Fingerprint, FingerprintStoreMessages, Id, Quiz, User } from "@recapp/models";
import { useStatefulActor } from "ts-actors-react";
import { i18n } from "@lingui/core";
import { fromTimestamp, toTimestamp } from "itu-utils";

import Card from "react-bootstrap/Card";
import { CheckCircleFill, CircleFill } from "react-bootstrap-icons";
import { actorUris } from "../../actorUris";
import { maybe } from "tsmonads";

interface Props {
    fingerprint: Fingerprint;
}

export const FingerprintCard = ({ fingerprint }: Props) => {
    const [, actor] = useStatefulActor<{ users: User[] }>("UserAdmin");
    const [quizData] = useStatefulActor<{
		quizzes: Map<Id, Partial<Quiz>>;
	}>("LocalUser");

    const toggleActivate = () => {
        actor.forEach(a =>
            a.send(actorUris.FingerprintStore, fingerprint.blocked ? FingerprintStoreMessages.Unblock(fingerprint.uid) : FingerprintStoreMessages.Block(fingerprint.uid))
        );
    };

    const userQuizzes: Array<{title: string, uid: Id}> = quizData.flatMap(q => maybe(q.quizzes)).map(ql => Array.from(ql.values()).filter(q => q.students?.includes(fingerprint.userUid)).map(q => ({title: q.title ?? "", uid: q.uid ?? "" as Id}))).orElse([]);

    console.log("Fingerprint:", fingerprint);

    return (
        <>
            <div className="position-relative">
                <div style={{ position: "absolute", top: -20, left: 2, fontSize: 14, color: "grey" }}>
                    {i18n._({
                        id: "fingerprint.card-last-seen: {date}",
                        values: {
                            date: fromTimestamp(fingerprint.lastSeen ?? toTimestamp()).toLocaleString({
                                dateStyle: "medium",
                                timeStyle: "medium",
                            }),
                        },
                    })}
                </div>
                <Card className="overflow-hidden">
                    <Card.Title className="p-3 ps-2 d-flex justify-content-between align-items-center text-bg-primary">
                        <p className="text-overflow-ellipsis m-0">{fingerprint.uid}</p>
                    </Card.Title>

                    <Card.Body style={{ minHeight: 120 }} className="mb-3 d-flex flex-column justify-content-between">
                        <div className="mb-1 d-flex">
                            <BlockedIndicator
                                onClick={toggleActivate}
                                blocked={fingerprint.blocked}
                            />
                            
                        </div>
                        <div className="mb-1 d-flex">
                            Auth count: {fingerprint.usageCount}
                        </div>
                        <div>
                            {userQuizzes.map(q => {
                                if (q.uid === fingerprint.initialQuiz) {
                                    return (
                                        <><span key={q.uid}><strong>{q.title}</strong></span><br /></>
                                    );    
                                }
                                return (
                                    <><span key={q.uid}>{q.title}</span><br /></>
                                );
                            })}
                        </div>
                    </Card.Body>
                </Card>
            </div>
        </>
    );
};

const BlockedIndicator = (props: { blocked: boolean; onClick: () => void }) => {
    return (
        <div>
            {props.blocked ? (
                <CheckCircleFill onClick={props.onClick} color="red" size="1.5rem" style={{ paddingBottom: 4 }} />
            ) : (
                <CircleFill onClick={props.onClick} color="grey" size="1.5rem" style={{ paddingBottom: 4 }} />
            )}
        </div>
    );
};
