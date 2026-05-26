/**
 * Soft animated glow halo behind the character. Color shifts with mood.
 * - idle  → pink
 * - focus → warm peach
 * - break → mint
 */
interface Props {
  mood?: "idle" | "focus" | "break";
}

export function AuraGlow({ mood = "idle" }: Props) {
  return (
    <div className={`aura aura-${mood}`} aria-hidden>
      <div className="aura-ring aura-ring-1" />
      <div className="aura-ring aura-ring-2" />
      <div className="aura-core" />
    </div>
  );
}
