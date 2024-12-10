import { useState } from "react";
import { Fingerprint } from "@recapp/models";
import { useStatefulActor } from "ts-actors-react";
import { i18n } from "@lingui/core";
import { Trans } from "@lingui/react";
import { maybe } from "tsmonads";

import InputGroup from "react-bootstrap/InputGroup";
import Form from "react-bootstrap/Form";
import { Funnel } from "react-bootstrap-icons";
import { FingerprintCard } from "./components/cards/FingerprintCard";
import { TooltipWrapper } from "./components/TooltipWrapper";

export const FingerprintPanel: React.FC = () => {
    const [fingerprintList] = useStatefulActor<{ fingerprints: Fingerprint[] }>("UserAdmin");
    const [filter, setFilter] = useState("");
    const fingerprints = fingerprintList
        .flatMap(fpl => maybe<Fingerprint[]>(fpl.fingerprints))
        .map(fpl =>
            fpl
                .filter(
                    (fp: Fingerprint) =>
                        fp.uid.toLocaleLowerCase().includes(filter)
                )
                .slice(0, 50)
        );
    return (
        <div>
            <h1>
                <Trans id="fingerprint-panel.title" />
            </h1>
            <div>
                <InputGroup className="mb-3">
                    <TooltipWrapper title={i18n._("fingerprint-panel.button-tooltip.filter")}>
                        <InputGroup.Text>
                            <Funnel />
                        </InputGroup.Text>
                    </TooltipWrapper>
                    <Form.Control
                        type="search"
                        placeholder={i18n._("fingerprint-panel.search-text")}
                        value={filter}
                        onChange={event => setFilter(event.target.value.toLocaleLowerCase())}
                    />
                </InputGroup>
            </div>
            <div className="pt-4 user-admin-card-list">
                {fingerprints.orElse<Fingerprint[]>([]).map((fp: Fingerprint) => (
                    <FingerprintCard key={fp.uid} fingerprint={fp} />
                ))}

                {/* to fill the empty space so that when a single card is displayed will not take the full width  */}
                <div />
                <div />
                <div />
            </div>
        </div>
    );
};
