import styles from './DashboardCard.module.css'

function DashboardCard(props){
    const { colors = {} } = props;
    return(
        <div className={styles.cardContainer} style={{ 
            backgroundColor: colors.bg,
        }}>
            <div className={styles.label}><p>{props.icon}{props.label}</p></div>
            <div className={styles.number}><p>{props.number}</p></div>
        </div>
    )
}

export default DashboardCard