import { useState } from "react";
import styles from "./ToggleButton.module.css";

function ToggleButton({
  labelOne = "Option 1",
  labelTwo = "Option 2",
  onToggle,
  defaultActive = 1,
  width = 140,
  height = 30,
  activeColor = "#54B79A", 
}) {
  const [active, setActive] = useState(defaultActive);

  const handleToggle = (value) => {
    setActive(value);
    onToggle && onToggle(value);
  };

  return (
    <div
      className={styles.container}
      style={{ width, height, backgroundColor: activeColor }}
    >
      <div
        className={styles.slider}
        style={{
          transform: active === 1 ? "translateX(0)" : `translateX(90%)`,
        }}
      />

      <div
        className={`${styles.option} ${active === 1 ? styles.active : ""}`}
        onClick={() => handleToggle(1)}
        style={{ width: width / 2 }}
      >
        {labelOne}
      </div>

      <div
        className={`${styles.option} ${active === 2 ? styles.active : ""}`}
        onClick={() => handleToggle(2)}
        style={{ width: width / 2 }}
      >
        {labelTwo}
      </div>
    </div>
  );
}

export default ToggleButton;