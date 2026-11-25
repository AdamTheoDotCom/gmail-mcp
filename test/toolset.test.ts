import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
	MAIN_TOOLS,
	refuseBlockedLabels,
	SEND_TOOLS,
	TRASH_TOOLS,
	toolsetFor,
} from "../src/toolset";

// Every tool name the server registers, read from the source.
const registered = new Set(
	[
		...readFileSync(`${import.meta.dir}/../src/index.ts`, "utf8").matchAll(
			/\btool\(\s*"([a-z_]+)"/g,
		),
	].map((m) => m[1]),
);

describe("toolsets", () => {
	test("every listed tool exists in the server", () => {
		for (const name of [...MAIN_TOOLS, ...TRASH_TOOLS]) expect(registered.has(name)).toBe(true);
	});

	test("no toolset can send", () => {
		for (const name of SEND_TOOLS) {
			expect(registered.has(name)).toBe(true);
			expect(MAIN_TOOLS.has(name)).toBe(false);
			expect(TRASH_TOOLS.has(name)).toBe(false);
		}
	});

	test("main cannot trash or delete; trash copy cannot label or draft", () => {
		for (const name of [
			"trash_message",
			"trash_thread",
			"untrash_message",
			"untrash_thread",
			"delete_label",
			"delete_draft",
		]) {
			expect(MAIN_TOOLS.has(name)).toBe(false);
			expect(TRASH_TOOLS.has(name)).toBe(true);
		}
		for (const name of [
			"modify_labels",
			"modify_thread_labels",
			"batch_modify_messages",
			"create_draft",
			"update_draft",
		]) {
			expect(TRASH_TOOLS.has(name)).toBe(false);
		}
	});

	test("TOOLSET picks the list, defaults to main, refuses typos", () => {
		expect(toolsetFor(undefined)).toBe(MAIN_TOOLS);
		expect(toolsetFor("")).toBe(MAIN_TOOLS);
		expect(toolsetFor(" Main ")).toBe(MAIN_TOOLS);
		expect(toolsetFor("trash")).toBe(TRASH_TOOLS);
		expect(() => toolsetFor("trsh")).toThrow();
	});

	test("label tools refuse TRASH and SPAM", () => {
		expect(() => refuseBlockedLabels(["TRASH"])).toThrow();
		expect(() => refuseBlockedLabels(["Label_1", "spam"])).toThrow();
		expect(() => refuseBlockedLabels(["Label_1", "STARRED"])).not.toThrow();
		expect(() => refuseBlockedLabels([])).not.toThrow();
	});
});

describe("what a deployment registers", () => {
	async function registeredFor(toolset: string | undefined) {
		const { GmailMCP } = await import("../src/index");
		const names: string[] = [];
		const agent = Object.create(GmailMCP.prototype) as Record<string, unknown>;
		agent.server = { tool: (name: string) => names.push(name) };
		agent.props = {
			email: "me@example.com",
			name: "T",
			accessToken: "a",
			refreshToken: "r",
			expiresAt: Date.now() + 3_600_000,
		};
		agent.ctx = {
			id: { name: "streamable-http:s" },
			storage: {
				get: async () => undefined,
				put: async () => {},
				list: async () => new Map(),
				delete: async () => {},
			},
		};
		agent.env = { TOOLSET: toolset };
		await (agent as { init: () => Promise<void> }).init();
		return names;
	}

	test("main registers exactly the main list", async () => {
		expect(new Set(await registeredFor(undefined))).toEqual(new Set(MAIN_TOOLS));
	});

	test("trash registers exactly the trash list", async () => {
		expect(new Set(await registeredFor("trash"))).toEqual(new Set(TRASH_TOOLS));
	});

	test("a mistyped TOOLSET registers nothing", async () => {
		await expect(registeredFor("everything")).rejects.toThrow();
	});
});
