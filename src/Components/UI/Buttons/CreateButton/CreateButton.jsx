import styles from './CreateButton.module.css'

function CreateButton({onClick}){
    return(
        <>
        <button className={styles.button} onClick={onClick}>Create</button>
        </>
    )
}

export default CreateButton