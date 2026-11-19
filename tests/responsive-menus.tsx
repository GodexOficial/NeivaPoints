import React from 'react';
import {createRoot} from 'react-dom/client';
import App from '../src/App';
import {AuthService} from '../src/services/authService';
import {ClassService} from '../src/services/classService';
import {StudentService} from '../src/services/studentService';
import {PointsService} from '../src/services/pointsService';
import {AppsService} from '../src/services/appsService';
import {enrichStudentWithStats} from '../src/utils/levelCalculator';
import '../src/index.css';

// Only this standalone test entry replaces network services. Never loads personal records.
const classes=[{id:'qa-class',name:'5º Ano',gradeNumber:5,shortName:'5TH',color:'amber',description:'Turma de teste',createdAt:'2026-01-01'}];
const student=enrichStudentWithStats({id:'qa-student',name:'Aluno de teste',classId:'qa-class',points:56,createdAt:'2026-01-01'});
AuthService.getSession=()=>({role:'teacher',name:'Professor de teste',username:'qa'});
AuthService.getTeachers=async()=>[];
AuthService.loadSecurityKeys=async()=>{};
ClassService.getAllClasses=async()=>classes;
ClassService.updateClass=async(id,updates)=>{Object.assign(classes[0],updates);(window as any).savedClass={id,...updates};return classes[0];};
StudentService.getAllStudentsWithStats=async()=>[student];
PointsService.getAllTransactions=async()=>[];
AppsService.getAll=async()=>[{id:'qa-app',name:'Aplicativo de teste',url:'https://example.com',position:0,createdAt:'2026-01-01',updatedAt:'2026-01-01'}];
AppsService.create=async(input)=>{(window as any).savedApp=input;return {...input,id:'qa-app',createdAt:'2026-01-01',updatedAt:'2026-01-01'};};
localStorage.setItem('sistema_pontos_language_v1','pt');
createRoot(document.getElementById('root')!).render(<App/>);
