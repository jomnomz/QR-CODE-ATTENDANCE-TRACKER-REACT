import styles from './SectionLabel.module.css'

function SectionLabel(props){
    return(
        <h1 className={styles.label}>{props.label}</h1>
    )
}

export default SectionLabel