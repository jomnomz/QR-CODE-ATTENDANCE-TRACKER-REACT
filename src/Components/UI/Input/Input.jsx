import styles from './input.module.css'

function Input({placeholder}){
    return(
        <input className={styles.input} placeholder={placeholder} type="text" />
    )
}

export default Input