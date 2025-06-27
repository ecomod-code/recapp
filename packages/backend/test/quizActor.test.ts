import { ActorSystem } from "ts-actors";
import { QuizActor } from "../src/actors/QuizActor";
import { QuizActorMessages } from "@recapp/models";

/**
 * This test ensures that the QuizActor handles invalid update payloads
 * without throwing an exception. The actor should return a serialized
 * error instead of crashing.
 */

describe("QuizActor", () => {
    test("update with invalid payload returns serialized error", async () => {
        const system = await ActorSystem.create({ systemName: "test" });
        const quizActor = await system.createActor(QuizActor, { name: "QuizActor" });
        const result = await system.ask(
            quizActor,
            QuizActorMessages.Update({ uid: "quiz-1", title: 5 } as any)
        );
        expect(result).toHaveProperty("name");
    });
});
