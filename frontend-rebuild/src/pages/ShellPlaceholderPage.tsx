export default function ShellPlaceholderPage({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <section>
      <h1>{title}</h1>
      <p>{description}</p>
      <p>Prototype placeholder for the rebuild shell phase.</p>
    </section>
  );
}
