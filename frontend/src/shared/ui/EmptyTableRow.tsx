type EmptyTableRowProps = {
  colSpan: number;
  message: string;
};

export function EmptyTableRow({ colSpan, message }: EmptyTableRowProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="empty-cell">
        {message}
      </td>
    </tr>
  );
}
