import styles from './TitleModalLabel.module.css'

function TitleModalLabel({children}){
    return(
        <p className={styles.title}>{children}</p>
    )
}

export default TitleModalLabel