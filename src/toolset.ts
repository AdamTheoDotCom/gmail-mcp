// Which tools a deployment offers, chosen by the TOOLSET variable.
//
// This copy is deployed twice. "main" (the default) is the everyday connection:
// it reads, drafts, labels, archives and renames labels, and has no way to send,
// trash or delete. "trash" is a second Worker used only for supervised clean-up:
// it can read, trash and untrash, and delete labels and drafts. Neither copy can
// send mail. Both lists are allowlists, so a tool added upstream stays off until
// it is named here.

export const MAIN_TOOLS: ReadonlySet<string> = new Set([
	"whoami",
	"search_messages",
	"get_message",
	"get_thread",
	"get_attachment",
	"list_labels",
	"create_label",
	"update_label",
	"modify_labels",
	"modify_thread_labels",
	"batch_modify_messages",
	"create_draft",
	"update_draft",
	"list_drafts",
	"stage_attachment_begin",
	"stage_attachment_append",
	"stage_attachment_finish",
]);

export const TRASH_TOOLS: ReadonlySet<string> = new Set([
	"whoami",
	"search_messages",
	"get_message",
	"get_thread",
	"list_labels",
	"list_drafts",
	"trash_message",
	"trash_thread",
	"untrash_message",
	"untrash_thread",
	"delete_label",
	"delete_draft",
]);

// Never offered by any toolset.
export const SEND_TOOLS: ReadonlySet<string> = new Set([
	"send_message",
	"reply_all",
	"forward_message",
	"send_draft",
]);

export function toolsetFor(value: string | undefined): ReadonlySet<string> {
	const v = (value ?? "").trim().toLowerCase();
	if (v === "" || v === "main") return MAIN_TOOLS;
	if (v === "trash") return TRASH_TOOLS;
	// A typo must not fall back to some other list: refuse to start instead.
	throw new Error(`unknown TOOLSET "${value}"; use "main" or "trash"`);
}

// Adding these system labels would trash or spam a message through the label
// tools, which the main toolset must not be able to do.
const BLOCKED_LABELS = new Set(["TRASH", "SPAM"]);

export function refuseBlockedLabels(addLabelIds: readonly string[]): void {
	const bad = addLabelIds.filter((id) => BLOCKED_LABELS.has(id.trim().toUpperCase()));
	if (bad.length > 0) {
		throw new Error(
			`adding ${bad.join(", ")} is not allowed on this connection; trash goes through the supervised trash connection`,
		);
	}
}
