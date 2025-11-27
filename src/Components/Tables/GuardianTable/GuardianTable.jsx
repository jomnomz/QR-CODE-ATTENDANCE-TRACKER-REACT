import React, { useState, useEffect } from 'react';
import Button from '../../UI/Buttons/Button/Button';
import styles from './GuardianTable.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {faPenToSquare, faTrashCan, 
} from "@fortawesome/free-solid-svg-icons";

const GuardianTable = () => {
  const [currentClass, setCurrentClass] = useState('7');
  const [expandedRow, setExpandedRow] = useState(null);
  const [guardians, setGuardians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const mockGuardian = [
      {
        first_name: 'John',
        middle_name: 'Michael',
        last_name: 'Smith',
        guardian_of: 'Kaiser Smith',
        grade:'7',
        section:'1',
        relation: 'Father',
        email: 'john.smith@school.edu',
        phone_number: '+1234567890',
      }
    ];
    setGuardians(mockGuardian);
    setLoading(false);
  }, [currentClass]);

  const handleClassChange = (className) => {
    setCurrentClass(className);
    setExpandedRow(null);
  };

  const toggleCard = (guadianId) => {
    if (expandedRow === guadianId) {
      setExpandedRow(null);
    } else {
      setExpandedRow(guadianId);
    }
  };

  const grades = ['7', '8', '9', '10', '11', '12'];

  return (
    <div className={styles.guardianTableContainer}>
      <div className={styles.guardianTable}>
        <div className={styles.classContainers}>
          {grades.map(grade => (
            <Button 
              key={grade}
              label={`Grade ${grade}`}
              tabBottom={true}
              height="xs"
              width="xs-sm"
              color="grades"
              active={currentClass === grade}
              onClick={() => handleClassChange(grade)}
            >
              Grade {grade}
            </Button>
          ))}

          <div className={styles.tableInfo}>
              <p>Showing {guardians.length} teacher/s in Grade {currentClass}</p>
          </div>
        </div>

        <table className={styles.guardiansTable}>
          <thead>
            <tr>
              <th>FIRST NAME</th>
              <th>MIDDLE NAME</th>
              <th>LAST NAME</th>
              <th>GUARDIAN OF</th>
              <th>RELATION</th>
              <th>EMAIL ADDRESS</th>
              <th>PHONE NO.</th>
              <th>EDIT</th>
              <th>DELETE</th>
            </tr>
          </thead>
          <tbody>
            {guardians.length === 0 ? (
              <tr>
                <td colSpan="11" className={styles.noGuardian}>
                  No guardians found
                </td>
              </tr>
            ) : (
              guardians.map(guardian => (
                <React.Fragment key={guardian.id}>
                  <tr 
                    className={`${styles.studentRow} ${expandedRow === guardian.id ? styles.hiddenRow : ''}`}
                    onClick={() => toggleCard(guardian.id)}
                  >
                    <td>{guardian.first_name}</td>
                    <td>{guardian.middle_name}</td>
                    <td>{guardian.last_name}</td>
                    <td>{guardian.guardian_of} ({guardian.grade}-{guardian.section})</td>
                    <td>{guardian.relation}</td>
                    <td>{guardian.email || "NA"}</td>
                    <td>{guardian.phone_number || "NA"}</td>
                    <td>
                      <div className={styles.icon}>
                        <FontAwesomeIcon icon={faPenToSquare} />
                      </div>
                    </td>
                    <td>
                      <div className={styles.icon}>
                        <FontAwesomeIcon icon={faTrashCan} />
                      </div>
                    </td>
                  </tr>
                  
                  {expandedRow === guardian.id && (
                    <tr 
                      className={styles.expandRow}
                      onClick={() => toggleCard(guardian.id)}
                    >
                      <td colSpan="9">
                        <div className={`${styles.guardianCard} ${styles.expand} ${styles.show}`}>
                          <div className={styles.guardianHeader}>
                            {guardian.first_name} {guardian.last_name}
                          </div>
                          <div className={styles.guardianInfo}>
                            <strong>Guardian Details</strong>
                          </div>
                          <div className={styles.guardianInfo}>Full Name: {guardian.first_name} {guardian.middle_name} {guardian.last_name}</div>
                          <div className={styles.guardianInfo}>Guadian Of: {guardian.guardian_of}</div>
                          <div className={styles.guardianInfo}>Grade and Section: {guardian.grade}-{guardian.section}</div>
                          <div className={styles.guardianInfo}>Relation: {guardian.relation}</div>
                          <div className={styles.guardianInfo}>Email: {guardian.email || 'NA'}</div>
                          <div className={styles.guardianInfo}>Phone: {guardian.phone_number || 'NA'}</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};


export default GuardianTable;