import styles from './DashboardCard.module.css'

function DashboardCard({ children, colors = {} }) {
    return (
        <div 
            className={styles.cardContainer} 
            style={{ backgroundColor: colors.bg }}
        >
            {children}
        </div>
    )
}

export default DashboardCard