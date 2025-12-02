import styles from './MessageModalLabel.module.css'

function MessageModalLabel({children}){
    return(
        <p className={styles.message}>{children}</p>
    )
}

export default MessageModalLabel