import styles from './ExitButton.module.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {faCircleXmark,
} from "@fortawesome/free-solid-svg-icons";

function ExitButton({onClick}){
    return(
        <button className={styles.button} onClick={onClick}><FontAwesomeIcon icon={faCircleXmark} /></button>
    )   
}

export default ExitButton