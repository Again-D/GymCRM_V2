import { SelectedMemberContextBadge } from "./members/components/SelectedMemberContextBadge";

export default function ShellPlaceholderPage({
  title,
  description,
  showMemberContext = false
}: {
  title: string;
  description: string;
  showMemberContext?: boolean;
}) {
  return (
    <section>
      <h1>{title}</h1>
      <p>{description}</p>
      {showMemberContext ? <SelectedMemberContextBadge /> : null}
      <p>Prototype placeholder for the rebuild shell phase.</p>
    </section>
  );
}
