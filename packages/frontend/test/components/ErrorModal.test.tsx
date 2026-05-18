import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useStatefulActor } from "ts-actors-react";
import { ErrorModal } from "../../src/components/modals/ErrorModal";
import { withState, withNoState } from "../actorMocks";

vi.mock("ts-actors-react", async importOriginal => {
	const actual = await importOriginal<typeof import("ts-actors-react")>();
	return { ...actual, useStatefulActor: vi.fn() };
});

// Trans renders inside a React portal outside the I18nProvider tree — mock it to avoid that
vi.mock("@lingui/react", async importOriginal => {
	const actual = await importOriginal<typeof import("@lingui/react")>();
	return { ...actual, Trans: ({ id }: { id: string }) => <span>{id}</span> };
});

const mockHook = vi.mocked(useStatefulActor);

function renderModal() {
	return render(<ErrorModal />);
}

describe("ErrorModal", () => {
	beforeEach(() => {
		mockHook.mockReset();
	});

	it("renders nothing when actor state is not ready (nothing)", () => {
		mockHook.mockReturnValue(withNoState() as any);
		const { container } = renderModal();
		expect(container.firstChild).toBeNull();
	});

	it("renders nothing when error string is empty", () => {
		mockHook.mockReturnValue(withState({ error: "" }) as any);
		const { container } = renderModal();
		expect(container.firstChild).toBeNull();
	});

	it("renders a modal when error is set", async () => {
		mockHook.mockReturnValue(withState({ error: "error-message-session-expired" }) as any);
		await act(async () => {
			renderModal();
		});
		// Modal should appear — react-bootstrap renders it into the document body
		expect(document.body.querySelector(".modal")).toBeTruthy();
	});

	it("passes the error id into the modal body", async () => {
		mockHook.mockReturnValue(withState({ error: "error-message-no-server-connection" }) as any);
		await act(async () => {
			renderModal();
		});
		// The Trans component renders its id as text when no catalog is active
		expect(document.body).toHaveTextContent("error-message-no-server-connection");
	});
});
