import styles from'./DateTodayLabel.module.css'

function DateTodayLabel(){
    const today = new Date();
    
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    
    const formattedDate = today.toLocaleDateString('en-US', options);
    
    return(
        <p className={styles.date}>{formattedDate}</p>
    )
}

export default DateTodayLabel