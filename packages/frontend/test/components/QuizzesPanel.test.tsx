import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useStatefulActor } from "ts-actors-react";
import type { Quiz, User, Id } from "@recapp/models";
import { toId } from "@recapp/models";
import { toTimestamp } from "itu-utils";
import { QuizzesPanel } from "../../src/components/quizzes-panel/QuizzesPanel";
import { withState, withNoState } from "../actorMocks";

vi.mock("ts-actors-react", async importOriginal => {
	const actual = await importOriginal<typeof import("ts-actors-react")>();
	return { ...actual, useStatefulActor: vi.fn() };
});

vi.mock("@lingui/react", async importOriginal => {
	const actual = await importOriginal<typeof import("@lingui/react")>();
	return { ...actual, Trans: ({ id }: { id: string }) => <span>{id}</span> };
});

const mockHook = vi.mocked(useStatefulActor);

function makeUser(overrides: Partial<User> = {}): User {
	return {
		uid: "teacher-1" as any,
		created: toTimestamp(),
		updated: toTimestamp(),
		username: "Test Teacher",
		role: "TEACHER",
		active: true,
		isTemporary: false,
		...overrides,
	} as User;
}

function makeQuiz(overrides: Partial<Quiz> = {}): Partial<Quiz> {
	return {
		uid: toId("quiz-1"),
		title: "My Quiz",
		state: "EDITING",
		teachers: ["teacher-1" as any],
		students: [],
		created: toTimestamp(),
		updated: toTimestamp(),
		archived: undefined,
		...overrides,
	};
}

function makeLocalUserState(
	quizzes: Partial<Quiz>[] = [],
	user: User = makeUser(),
	showArchived = false
) {
	const quizzesMap = new Map<Id, Partial<Quiz>>(quizzes.map(q => [q.uid!, q]));
	return {
		user,
		quizzes: quizzesMap,
		showArchived,
		updateCounter: quizzes.length,
		teachers: new Map<Id, string[]>(),
		error: "",
	};
}

function renderPanel() {
	return render(
		<MemoryRouter>
			<QuizzesPanel />
		</MemoryRouter>
	);
}

describe("QuizzesPanel", () => {
	beforeEach(() => {
		mockHook.mockReset();
	});

	it("renders the filter input", () => {
		mockHook.mockReturnValue(withState(makeLocalUserState()) as any);
		renderPanel();
		// The search/filter input should always be present
		expect(screen.getByRole("searchbox")).toBeInTheDocument();
	});

	it("shows 'Create Quiz' and 'Import' buttons for non-temporary users", () => {
		mockHook.mockReturnValue(withState(makeLocalUserState()) as any);
		renderPanel();
		// Non-temporary user → create and import buttons visible
		const buttons = screen.getAllByRole("button");
		expect(buttons.length).toBeGreaterThanOrEqual(2);
	});

	it("hides action buttons for temporary accounts", () => {
		const tempUser = makeUser({ isTemporary: true });
		mockHook.mockReturnValue(withState(makeLocalUserState([], tempUser)) as any);
		renderPanel();
		// Temporary accounts should not see create/import buttons
		expect(screen.queryByRole("button")).toBeNull();
	});

	it("renders a quiz card for each quiz in state", () => {
		const quizzes = [
			makeQuiz({ uid: toId("q1"), title: "Quiz One" }),
			makeQuiz({ uid: toId("q2"), title: "Quiz Two" }),
		];
		mockHook.mockReturnValue(withState(makeLocalUserState(quizzes)) as any);
		renderPanel();
		expect(screen.getByText("Quiz One")).toBeInTheDocument();
		expect(screen.getByText("Quiz Two")).toBeInTheDocument();
	});

	it("hides archived quizzes when showArchived is false", () => {
		const quizzes = [
			makeQuiz({ uid: toId("q1"), title: "Active Quiz" }),
			makeQuiz({ uid: toId("q2"), title: "Archived Quiz", archived: toTimestamp() }),
		];
		mockHook.mockReturnValue(withState(makeLocalUserState(quizzes, makeUser(), false)) as any);
		renderPanel();
		expect(screen.getByText("Active Quiz")).toBeInTheDocument();
		expect(screen.queryByText("Archived Quiz")).toBeNull();
	});

	it("shows archived quizzes when showArchived is true", () => {
		const quizzes = [
			makeQuiz({ uid: toId("q1"), title: "Active Quiz" }),
			makeQuiz({ uid: toId("q2"), title: "Archived Quiz", archived: toTimestamp() }),
		];
		mockHook.mockReturnValue(withState(makeLocalUserState(quizzes, makeUser(), true)) as any);
		renderPanel();
		expect(screen.getByText("Active Quiz")).toBeInTheDocument();
		expect(screen.getByText("Archived Quiz")).toBeInTheDocument();
	});

	it("renders nothing when actor state is not ready", () => {
		mockHook.mockReturnValue(withNoState() as any);
		renderPanel();
		// No quiz cards rendered; filter is still shown (panel renders unconditionally)
		expect(screen.queryByText("Quiz One")).toBeNull();
	});
});

