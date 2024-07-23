import { keys } from "rambda";
import { useStatefulActor } from "ts-actors-react";
import { maybe, nothing } from "tsmonads";
import { UserStoreMessage } from "@recapp/models";
import { LocalUserState } from "../../actors/LocalUserActor";

// export type UserStoreMessage = UnionOf<typeof UserStoreMessages>;

export const useLocalUser = () => {
    // const [mbLocalUser, tryLocalUserActor] = useStatefulActor<{ user: User }>("LocalUser");
    const [mbLocalUser, tryLocalUserActor] = useStatefulActor<LocalUserState>("LocalUser");

    const localUser = mbLocalUser
        .flatMap(u => (keys(u.user).length > 0 ? maybe(u.user) : nothing()))
        .match(
            localUser => localUser,
            () => null
        );

    const localUserActorSend = (message: UserStoreMessage) => {
        if (tryLocalUserActor.succeeded) {
            tryLocalUserActor.forEach(actor => actor.send(actor, message));
        } else {
            throw new Error("no actor present in useLocalUser");
        }
    };

    return { localUser, localUserActorSend, isLocalUserActorSucceeded: tryLocalUserActor.succeeded };
};
