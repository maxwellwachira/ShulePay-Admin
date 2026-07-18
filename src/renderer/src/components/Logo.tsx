/**
 * Logo placeholder — a branded monogram mark + wordmark. Swap the mark for the real
 * ShulePay logo (drop an SVG/PNG in place of the `.logo-mark` contents).
 */
export function Logo({ size = 36 }: { size?: number }): JSX.Element {
  return (
    <div className="logo">
      <div
        className="logo-mark"
        style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}
        aria-label="ShulePay"
      >
        <span>S</span>
      </div>
      <div className="logo-text">
        <span className="logo-name" style={{ fontSize: Math.round(size * 0.42) }}>
          ShulePay
        </span>
        <span className="logo-tag">Admin</span>
      </div>
    </div>
  );
}
