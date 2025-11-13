import styles from './PageLabel.module.css'

function PageLabel(props){
    return(
        <h1 className={styles.label}>{props.icon}{props.label}</h1>
    )
}

export default PageLabel