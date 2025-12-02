import styles from './input.module.css'

function Input({ placeholder, value, onChange }) {
  return (
    <input 
      className={styles.input} 
      placeholder={placeholder} 
      type="text"
      value={value}
      onChange={onChange}
    />
  )
}

export default Input