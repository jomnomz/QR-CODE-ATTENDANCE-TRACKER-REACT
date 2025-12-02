import styles from './InfoBox.module.css'

function InfoBox({ 
  type = 'info', 
  children 
}) {
  return (
    <div className={`${styles.infoBox} ${styles[type]}`}>
      <div className={styles.infoText}>
        {children}
      </div>
    </div>
  );
}

export default InfoBox;