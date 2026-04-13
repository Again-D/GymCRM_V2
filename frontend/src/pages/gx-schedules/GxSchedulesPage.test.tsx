import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FoundationProviders } from "../../app/providers";
import { appQueryClient } from "../../app/queryClient";
import GxSchedulesPage from "./GxSchedulesPage";

vi.mock("../../api/client", () => ({
	ApiClientError: class extends Error {
		constructor(
			public message: string,
			public status: number,
		) {
			super(message);
		}
	},
	apiGet: vi.fn(),
	apiPost: vi.fn(),
	apiPut: vi.fn(),
	apiDelete: vi.fn(),
	configureApiAuth: vi.fn(),
	isMockApiMode: () => true,
}));

vi.mock("../../api/queryInvalidation", () => ({
	invalidateQueryDomains: vi.fn(),
	getQueryInvalidationVersion: vi.fn(() => 0),
	useQueryInvalidationVersion: vi.fn(() => 0),
	resetQueryInvalidationStateForTests: vi.fn(),
}));

import { apiGet } from "../../api/client";

const mockSchedules = [
	{
		scheduleId: 1,
		sourceRuleId: null,
		sourceExceptionId: null,
		trainerUserId: 41,
		trainerName: "Yoga Master",
		className: "Yoga",
		startAt: "2026-03-30T09:00:00",
		endAt: "2026-03-30T10:00:00",
		capacity: 20,
		currentCount: 5,
	},
];

const mockSnapshot = {
	month: "2026-03",
	rules: [],
	generatedSchedules: mockSchedules,
	exceptions: [],
};

const mockTrainers = [
	{
		userId: 41,
		userName: "Yoga Master",
	},
];

describe("GxSchedulesPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		appQueryClient.clear();
		vi.mocked(apiGet).mockImplementation((url: string) => {
			if (url.includes("snapshot")) {
				return Promise.resolve({
					success: true,
					data: JSON.parse(JSON.stringify(mockSnapshot)),
				});
			}
			return Promise.resolve({
				success: true,
				data: JSON.parse(JSON.stringify(mockTrainers)),
			});
		});
	});

	afterEach(() => {
		cleanup();
	});

	const RENDER_TIMEOUT = 5000;

	it("renders schedule list and filter", async () => {
		render(
			<FoundationProviders
				authValue={{
					securityMode: "jwt",
					authUser: {
						userId: 1,
						centerId: 1,
						username: "admin",
						primaryRole: "ROLE_MANAGER",
						roles: ["ROLE_MANAGER"],
					},
				}}
			>
				<GxSchedulesPage />
			</FoundationProviders>,
		);

		expect(
			(await screen.findAllByText(/Yoga/, {}, { timeout: RENDER_TIMEOUT }))
				.length,
		).toBeGreaterThan(0);
	}, 10000);

	it("opens create rule modal", async () => {
		render(
			<FoundationProviders
				authValue={{
					securityMode: "jwt",
					authUser: {
						userId: 1,
						centerId: 1,
						username: "admin",
						primaryRole: "ROLE_MANAGER",
						roles: ["ROLE_MANAGER"],
					},
				}}
			>
				<GxSchedulesPage />
			</FoundationProviders>,
		);

		expect(
			(await screen.findAllByText(/Yoga/, {}, { timeout: RENDER_TIMEOUT }))
				.length,
		).toBeGreaterThan(0);
		const createButtons = await screen.findAllByRole(
			"button",
			{ name: "새 규칙" },
			{ timeout: RENDER_TIMEOUT },
		);
		fireEvent.click(createButtons[0] as HTMLButtonElement);

		expect(
			await screen.findByRole(
				"heading",
				{ name: "새 GX 규칙" },
				{ timeout: RENDER_TIMEOUT },
			),
		).toBeTruthy();
	}, 10000);

	it("validates start/end time in create rule modal", async () => {
		render(
			<FoundationProviders
				authValue={{
					securityMode: "jwt",
					authUser: {
						userId: 1,
						centerId: 1,
						username: "admin",
						primaryRole: "ROLE_MANAGER",
						roles: ["ROLE_MANAGER"],
					},
				}}
			>
				<GxSchedulesPage />
			</FoundationProviders>,
		);

		expect(
			(await screen.findAllByText(/Yoga/, {}, { timeout: RENDER_TIMEOUT }))
				.length,
		).toBeGreaterThan(0);
		const createButtons = await screen.findAllByRole(
			"button",
			{ name: "새 규칙" },
			{ timeout: RENDER_TIMEOUT },
		);
		fireEvent.click(createButtons[0] as HTMLButtonElement);

		const titleField = await screen.findByRole(
			"textbox",
			{ name: "수업명" },
			{ timeout: RENDER_TIMEOUT },
		);

		fireEvent.change(titleField, {
			target: { value: "Fail Test" },
		});
		fireEvent.change(screen.getByLabelText(/시작 시간/), {
			target: { value: "10:00" },
		});
		fireEvent.change(screen.getByLabelText(/종료 시간/), {
			target: { value: "09:00" },
		});
		fireEvent.change(screen.getByLabelText(/정원/), {
			target: { value: "20" },
		});
		fireEvent.change(screen.getByLabelText(/적용 시작일/), {
			target: { value: "2026-03-30" },
		});

		const submitBtn = await screen.findByRole(
			"button",
			{ name: /규칙 생성/ },
			{ timeout: RENDER_TIMEOUT },
		);
		fireEvent.click(submitBtn);

		await screen.findByText(
			/종료 시간은 시작 시간보다 늦어야 합니다/,
			{},
			{ timeout: RENDER_TIMEOUT },
		);
	}, 10000);

	it("limits trainer exception UI to off and memo only", async () => {
		render(
			<FoundationProviders
				authValue={{
					securityMode: "jwt",
					authUser: {
						userId: 41,
						centerId: 1,
						username: "trainer-gx",
						primaryRole: "ROLE_TRAINER",
						roles: ["ROLE_TRAINER"],
					},
				}}
			>
				<GxSchedulesPage />
			</FoundationProviders>,
		);

		expect(
			(await screen.findAllByText(/Yoga/, {}, { timeout: RENDER_TIMEOUT }))
				.length,
		).toBeGreaterThan(0);

		const scheduleCards = screen.getAllByText("Yoga");
		const scheduleCard =
			scheduleCards[scheduleCards.length - 1]?.closest(".ant-card");
		expect(scheduleCard).toBeTruthy();
		const target = await waitFor(
			() => {
				const btn = within(scheduleCard as HTMLElement).queryByRole("button", {
					name: "회차 예외",
				});
				if (!btn) throw new Error("exception button not ready");
				return btn;
			},
			{ timeout: RENDER_TIMEOUT },
		);

		fireEvent.click(target);

		expect(
			await screen.findByRole(
				"heading",
				{ name: "GX 회차 예외" },
				{ timeout: RENDER_TIMEOUT },
			),
		).toBeTruthy();
		expect(
			screen.getByText(
				"트레이너는 본인 회차의 휴강과 메모만 처리할 수 있습니다.",
			),
		).toBeTruthy();
	}, 10000);
});
