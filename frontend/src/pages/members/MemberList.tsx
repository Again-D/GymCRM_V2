import { MemberListSection } from "./components/MemberListSection";
import { SelectedMemberSummaryCard } from "./components/SelectedMemberSummaryCard";

export default function MemberList() {
  return (
    <div className="members-prototype-layout ops-shell">
      <MemberListSection />
      <SelectedMemberSummaryCard />
    </div>
  );
}
