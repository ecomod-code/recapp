import { ActorSystem } from "ts-actors";
import { toTimestamp } from "itu-utils";
import { toId } from "@recapp/models";
import { CommentActor } from "../src/actors/CommentActor";
import { CommentActorMessages } from "@recapp/models";

const QUIZ_ID = toId("quiz-1");
const USER_ID = toId("user-1");

// In tests, system.ask() sends as SYSTEM user. CommentActor.Delete allows
// deletion when clientUserId === c.authorId, so we set authorId to match.
const SYSTEM_ID = "SYSTEM" as typeof USER_ID;

function makeComment() {
	return {
		authorId: SYSTEM_ID,
		authorName: "Test User",
		text: "Great quiz!",
		upvoters: [] as typeof USER_ID[],
		answered: false,
		relatedQuiz: QUIZ_ID,
		created: toTimestamp(),
		updated: toTimestamp(),
	};
}

describe("CommentActor", () => {
	let system: ActorSystem;

	beforeEach(async () => {
		system = await ActorSystem.create({ systemName: "test" });
	});

	afterEach(async () => {
		await system.shutdown();
	});

	test("GetAll on empty collection returns unit without throwing", async () => {
		const ref = await system.createActor(CommentActor, { name: "C_quiz1" }, QUIZ_ID);
		const result = await system.ask(ref, CommentActorMessages.GetAll());
		expect(result).toBeDefined();
	});

	test("Create returns a comment uid", async () => {
		const ref = await system.createActor(CommentActor, { name: "C_quiz1" }, QUIZ_ID);
		const result = await system.ask(ref, CommentActorMessages.Create(makeComment()));
		expect(typeof result).toBe("string");
		expect(result).toBeTruthy();
	});

	test("Upvote adds userId to upvoters", async () => {
		const ref = await system.createActor(CommentActor, { name: "C_quiz1" }, QUIZ_ID);
		const commentId = (await system.ask(ref, CommentActorMessages.Create(makeComment()))) as any;

		const upvoted = (await system.ask(
			ref,
			CommentActorMessages.Upvote({ commentId, userId: USER_ID })
		)) as any;

		expect(upvoted.upvoters).toContain(USER_ID);
	});

	test("Upvote twice removes the upvote (toggle)", async () => {
		const ref = await system.createActor(CommentActor, { name: "C_quiz1" }, QUIZ_ID);
		const commentId = (await system.ask(ref, CommentActorMessages.Create(makeComment()))) as any;

		await system.ask(ref, CommentActorMessages.Upvote({ commentId, userId: USER_ID }));
		const toggled = (await system.ask(
			ref,
			CommentActorMessages.Upvote({ commentId, userId: USER_ID })
		)) as any;

		expect(toggled.upvoters).not.toContain(USER_ID);
	});

	test("Delete removes the comment", async () => {
		const ref = await system.createActor(CommentActor, { name: "C_quiz1" }, QUIZ_ID);
		const commentId = (await system.ask(ref, CommentActorMessages.Create(makeComment()))) as any;

		const deleteResult = await system.ask(ref, CommentActorMessages.Delete(commentId));
		expect(deleteResult).toBeDefined();
	});

	test("Upvote on non-existent comment rejects with error", async () => {
		const ref = await system.createActor(CommentActor, { name: "C_quiz1" }, QUIZ_ID);
		await expect(
			system.ask(ref, CommentActorMessages.Upvote({ commentId: toId("no-such-comment"), userId: USER_ID }))
		).rejects.toThrow("Comment not found");
	});
});
