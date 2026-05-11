import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../api/client";
import MemberQrPage from "./MemberQrPage";

describe("MemberQrPage", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-05-08T10:00:00Z"));
		setMockApiModeForTests(false);
		vi.stubGlobal("fetch", createFetchMock());
	});

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		setMockApiModeForTests(null);
		vi.unstubAllGlobals();
	});

	it("renders a QR session and refreshes it after the token expires", async () => {
		render(
			<MemoryRouter initialEntries={["/member-qr?token=bootstrap-token"]}>
				<MemberQrPage />
			</MemoryRouter>,
		);

		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(screen.getByTestId("member-qr-token").textContent).toContain(
			"qr-token-1",
		);
		expect(screen.getByText("홍길동님의 출입 QR")).toBeTruthy();

		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: /QR 새로고침/ }));
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(screen.getByTestId("member-qr-token").textContent).toContain(
			"qr-token-2",
		);
	});

	it("shows a retry state when the bootstrap token is missing", async () => {
		render(
			<MemoryRouter initialEntries={["/member-qr"]}>
				<MemberQrPage />
			</MemoryRouter>,
		);

		await act(async () => {
			await Promise.resolve();
		});

		expect(screen.getByText("회원 QR을 불러올 수 없습니다")).toBeTruthy();
		expect(
			screen.getByText("회원 QR 링크 토큰이 없습니다. 다시 열어주세요."),
		).toBeTruthy();
	});

	it("clears the visible QR when refresh fails", async () => {
		vi.unstubAllGlobals();
		vi.stubGlobal(
			"fetch",
			createFetchMock({ failOnRequest: 2, ttlSeconds: 30 }),
		);

		render(
			<MemoryRouter initialEntries={["/member-qr?token=bootstrap-token"]}>
				<MemberQrPage />
			</MemoryRouter>,
		);

		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(screen.getByTestId("member-qr-token").textContent).toContain(
			"qr-token-1",
		);

		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: /QR 새로고침/ }));
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(screen.queryByTestId("member-qr-token")).toBeNull();
		expect(screen.getByText("QR을 다시 불러와야 합니다")).toBeTruthy();
		expect(
			screen.getByText("오류를 확인한 뒤 새로고침을 눌러주세요."),
		).toBeTruthy();
	});
});

function createFetchMock(options?: {
	failOnRequest?: number;
	ttlSeconds?: number;
}) {
	let requestCount = 0;

	return vi.fn(async () => {
		requestCount += 1;
		if (options?.failOnRequest === requestCount) {
			throw new Error("bootstrap refresh failed");
		}

		const tokenSuffix = requestCount;
		const issuedAt = "2026-05-08T10:00:00Z";
		const ttlSeconds = options?.ttlSeconds ?? 60;
		const expiresAt = new Date(
			Date.parse(issuedAt) + ttlSeconds * 1000 * requestCount,
		).toISOString();

		return {
			ok: true,
			json: async () => ({
				success: true,
				data: {
					memberId: 101,
					memberName: "홍길동",
					qrToken: `qr-token-${tokenSuffix}`,
					issuedAt,
					expiresAt,
					ttlSeconds,
					bootstrapExpiresAt: "2026-05-08T23:59:59Z",
				},
				message: "회원 QR 세션이 갱신되었습니다.",
				timestamp: "2026-05-08T10:00:00Z",
				traceId: "trace-member-qr",
			}),
		};
	});
}
