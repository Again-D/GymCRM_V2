type ContentHeaderProps = {
  title: string;
  description: string;
  showSelectMemberAction: boolean;
  onSelectMemberClick: () => void;
};

export function ContentHeader({
  title,
  description,
  showSelectMemberAction,
  onSelectMemberClick
}: ContentHeaderProps) {
  return (
    <header className="content-header">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {showSelectMemberAction ? (
        <button type="button" className="secondary-button" onClick={onSelectMemberClick}>
          회원 선택하러 가기
        </button>
      ) : null}
    </header>
  );
}
