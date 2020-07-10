var express = require('express');
var router = express.Router();
const pool = require('../db/dbConfig');
const verify = require('../config/verifyToken');
const jwt = require('jsonwebtoken');
const { json } = require('express');


router.get('/timesheet',verify,(request, response) => {

  console.log('Expense request.user '+JSON.stringify(request.user));
  var userId = request.user.sfid; 
  var projectName ='';
  pool
  .query('SELECT sfid, Name FROM salesforce.Contact  WHERE sfid = $1;',[userId])
  .then(contactResult => {
    console.log('Name of Contact  ::     '+contactResult.rows[0].name+' sfid'+contactResult.rows[0].sfid);
    var contactId = contactResult.rows[0].sfid;
      pool
      .query('SELECT sfid, Name, Team__c FROM salesforce.Team_Member__c WHERE Representative__c = $1 ;',[contactId])
      .then(teamMemberResult => {
        console.log('Name of TeamMemberId  : '+teamMemberResult.rows[0].name+'   sfid :'+teamMemberResult.rows[0].sfid);
        console.log('Team Id  : '+teamMemberResult.rows[0].team__c);
        console.log('Number of Team Member '+teamMemberResult.rows.length);
        
        var projectTeamparams = [], lstTeamId = [];
        for(var i = 1; i <= teamMemberResult.rows.length; i++) {
          projectTeamparams.push('$' + i);
          lstTeamId.push(teamMemberResult.rows[i-1].team__c);
        } 
        var projectTeamQueryText = 'SELECT sfid, Name, Project__c FROM salesforce.Project_Team__c WHERE Team__c IN (' + projectTeamparams.join(',') + ')';
        console.log('projectTeamQueryText '+projectTeamQueryText);
        
          pool
          .query(projectTeamQueryText,lstTeamId)
          .then((projectTeamResult) => {
              console.log('projectTeam Reocrds Length '+projectTeamResult.rows.length);
              console.log('projectTeam Name '+projectTeamResult.rows[0].name);

              var projectParams = [], lstProjectId = [];
              for(var i = 1; i <= projectTeamResult.rows.length; i++) {
                projectParams.push('$' + i);
                lstProjectId.push(projectTeamResult.rows[i-1].project__c);
              } 
              console.log('lstProjectId  : '+lstProjectId);
              var projetQueryText = 'SELECT sfid, Name FROM salesforce.Milestone1_Project__c WHERE sfid IN ('+ projectParams.join(',')+ ')';

              pool.
              query(projetQueryText, lstProjectId)
              .then((projectQueryResult) => { 
                    console.log('Number of Projects '+projectQueryResult.rows.length);
                    console.log('Project sfid '+projectQueryResult.rows[0].sfid+ 'Project Name '+projectQueryResult.rows[0].name);
                    var projectList = projectQueryResult.rows;
                    var lstProjectId = [], projectParams = [];
                    var j = 1;
                    projectList.forEach((eachProject) => {
                      console.log('eachProject sfid : '+eachProject.sfid);
                      lstProjectId.push(eachProject.sfid);
                      projectParams.push('$'+ j);
                      console.log('eachProject name : '+eachProject.name);
                      j++;
                    });


                  var taskQueryText = 'SELECT sfid, Name FROM salesforce.Milestone1_Task__c  WHERE Project_Name__c IN ('+projectParams.join(',')+') AND  Project_Milestone__c IN (SELECT sfid FROM salesforce.Milestone1_Milestone__c WHERE Name = \'Timesheet Category\') AND sfid IS NOT NULL';
                  console.log('taskQueryText  : '+taskQueryText);



                    pool
                    .query(taskQueryText, lstProjectId)
                    .then((taskQueryResult) => {
                        console.log('taskQueryResult  rows '+taskQueryResult.rows.length);
                        response.send({projectList : projectQueryResult.rows, contactList : contactResult.rows, taskList : taskQueryResult.rows }); // render calendar
                    })
                    .catch((taskQueryError) => {
                        console.log('taskQueryError : '+taskQueryError.stack);
                       // response.send({projectList : projectQueryResult.rows, contactList : contactResult.rows, taskList : taskQueryResult.rows }); // render calendar
                    })
                    
              })
              .catch((projectQueryError) => {
                    console.log('projectQueryError '+projectQueryError.stack);
              })
           
          })
            .catch((projectTeamQueryError) =>{
              console.log('projectTeamQueryError : '+projectTeamQueryError.stack);
            })          
        })
        .catch((teamMemberQueryError) => {
        console.log('Error in team member query '+teamMemberQueryError.stack);
        })

      }) 
      .catch(contactQueryError => console.error('Error executing contact query', contactQueryError.stack));

});



router.get('/getevents',verify, function(req, res, next) 
{
    
    var user = 'manager';
    
    console.log('Expense request.user '+JSON.stringify(request.user));
    var userId = request.user.sfid; 

    
        pool
        .query('SELECT sfid, Name, Team__c FROM salesforce.Team_Member__c WHERE Representative__c = $1 ;',[userId])
        .then((teamMemberResult) => {
            res.send(teamMemberResult);
        })
        .then((teamMemberResult) => {
            res.send(teamMemberResult);
        })
        .catch((teamMemberQueryError) => {
            res.send(teamMemberQueryError.stack);
        });
   

   /*  console.log('req.query :'+req.query.date);
    var strdate = req.query.date;
    console.log('typeof date '+typeof(strdate));
    //  var selectedDate = new Date(strdate);
    var selectedDate = new Date('2020/02/01');

    // var year = selectedDate.getFullYear();
    var year = 2020;
    // var month = selectedDate.getMonth();
    var month = 01;
    console.log('Month '+selectedDate.getMonth());
    console.log('Year : '+selectedDate.getFullYear());
    var numberOfDays = new Date(year, month+1, 0).getDate();
    console.log('numberOfDays : '+numberOfDays);
    
    var lstEvents = [];
    for(let i = 1;i <= 31 ; i++)
    {
      lstEvents.push({
          title : 'Fill Actuals',
          start : year+'-'+(month+1)+'-'+i,
          end : year+'-'+(month+1)+'-'+i
      });
      lstEvents.push({
        title : 'Create Task',
        start : year+'-'+(month+1)+'-'+i,
        end : year+'-'+(month+1)+'-'+i
      });
      lstEvents.push({
        title : 'Details',
        start : year+'-'+(month+1)+'-'+i,
        end : year+'-'+(month+1)+'-'+i
      });
      lstEvents.push({
        title : 'Planned Hours',
        start : year+'-'+(month+1)+'-'+i,
        end : year+'-'+(month+1)+'-'+i
      });
      lstEvents.push({
        title : 'Actual Hours',
        start : year+'-'+(month+1)+'-'+i,
        end : year+'-'+(month+1)+'-'+i
      });
      lstEvents.push({
        title : 'Date : '+year+'-'+(month+1)+'-'+i,
        start : year+'-'+(month+1)+'-'+i,
        end : year+'-'+(month+1)+'-'+i
      });
    } 
     //console.log('JSON.strigify '+JSON.stringify(lstEvents));
      res.send(lstEvents); */
   });





router.get('/getdata',verify, function(req, response, next) 
{

  console.log('Expense request.user '+JSON.stringify(request.user));
  var userId = request.user.sfid; 
    
        pool
        .query('SELECT sfid, Name, Team__c FROM salesforce.Team_Member__c WHERE Representative__c = $1 ;',[userId])
        .then((teamMemberResult) => {
            response.send(teamMemberResult);
            if(teamMemberResult.rowCount > 0)
            {
                const lstTeamId = [] , lstTeamIdParams = [];
                for(let i =1 ; i <= iteamMemberResult.rowCount ; i++)
                {
                    lstTeamIdParams.push('$'+i);
                    lstTeamId.push(iteamMemberResult[i-1].Team__c);
                }

                if(lstTeamId.length > 0 && lstTeamIdParams.length >0)
                {
                    var projectTeamQueryText = 'SELECT sfid, Name, Project__c FROM salesforce.Project_Team__c WHERE Team__c IN (' + lstTeamIdParams.join(',') + ')';
                    pool
                    .query(projectTeamQueryText,lstTeamId)
                    .then((projectTeamQueryResult) => {
                        response.send(projectTeamQueryResult);
                    })
                    .catch((projectTeamQueryError) => {
                        response.send(projectTeamQueryError.stack);
                    })
                }
            }
        })
        .catch((teamMemberQueryError) => {
            response.send(teamMemberQueryError.stack);
        });
});



router.post('/createtask',async (request, response) => {
    var formData = request.body;
    console.log('formData  '+JSON.stringify(formData));
    console.log('ffff '+formData.taskname);

  var taskname = formData.taskname,
        status = formData.status,
        projectname = formData.projectname, 
        taskdate = formData.taskdate, 
        assignedresource = formData.assignedresource,
        tasktype = formData.tasktype,
        plannedstarttime = formData.plannedstarttime,
        plannedendtime = formData.plannedendtime;

  console.log('taskname '+taskname);
  console.log('status : '+status);
  console.log('projectname  '+projectname);
  console.log('taskdate '+taskdate);
  var dateParts = taskdate.split('/');

  console.log('assignedresource  '+assignedresource);
  console.log('tasktype   '+tasktype);

  console.log('plannedstarttime  '+plannedstarttime);
  console.log('plannedendtime '+plannedendtime);
 // let qry='SELECT Id, Name FROM Milestone1_Milestone__c WHERE Project__c =$1 AND Name =$2,'+[projectname,'Timesheets'];
 pool.query('SELECT Id,sfid, Name,project__c FROM salesforce.Milestone1_Milestone__c WHERE project__c = $1 AND Name = $2',[projectname, 'Timesheets'])
 // pool.query('SELECT id,sfid from salesforce.Milestone1_Milestone__c WHERE Name = $1',['Timesheet Category'])
 .then((milestoneQueryResult) => {
    console.log('milestoneQueryResult '+JSON.stringify(milestoneQueryResult.rows))
      if(milestoneQueryResult.rowCount > 0)
      {
          console.log('milestoneQueryResult '+JSON.stringify(milestoneQueryResult.rows));
          var timesheetMilestoneId =  milestoneQueryResult.rows[0].sfid;
          console.log('timesheetMilestoneId Inside Milestone : '+timesheetMilestoneId +' Name :'+milestoneQueryResult.rows[0].name);   /*'a020p000001cObIAAU'*/
            pool
              .query('INSERT INTO salesforce.Milestone1_Task__c (Name, project_milestone__c, RecordTypeId, Task_Stage__c, Project_Name__c, Start_Date__c, Assigned_Manager__c,Task_Type__c ,Start_Time__c,End_Time__c) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',[taskname,timesheetMilestoneId ,'0120p000000C8plAAC',status,projectname,taskdate,assignedresource,tasktype,plannedstarttime,plannedendtime])
              .then((saveTaskResult) => {
                      console.log('saveTaskResult =====>>>>>>>>>>>>  : '+JSON.stringify(saveTaskResult.rows[0]));
      //  response.send('savedInserted');
    //  console.log('inserted Id '+saveTaskResult.rows[0]);
                 response.send({success : true});
                  })
                    .catch((saveTaskError) => {
                     console.log('saveTaskError  '+saveTaskError.stack);
                      console.log('saveTaskError._hc_err  : '+saveTaskError._hc_err.msg);
                       response.send({success :false});
                  }) 

        }

  })
  .catch((milestoneQueryError) => {
      console.log('milestoneQueryError '+milestoneQueryError.stack);
  })

  
  
});


router.post('/fillactuals',(request, response) => {
    var fillActualsFormData = request.body;
    console.log('fillActualsFormData  '+JSON.stringify(fillActualsFormData));
    var projectName = fillActualsFormData.projectName,
        dateIncurred = fillActualsFormData.dateIncurred,
        selectedTask = fillActualsFormData.selectedTask,
        statusTimesheet = fillActualsFormData.statusTimesheet,
        actualStartTimeTimesheet = fillActualsFormData.plannedStartTimeTimesheet,
        actualEndTimeTimesheet = fillActualsFormData.plannedEndTimeTimesheet,
        descriptionTimesheet = fillActualsFormData.descriptionTimesheet,
        representative = fillActualsFormData.representative;


    console.log('projectName  : '+projectName);
    console.log('dateIncurred   : '+dateIncurred);
    console.log('selectedTask   : '+selectedTask);
    console.log('statusTimesheet   : '+statusTimesheet);
    console.log('representative  '+representative);
    console.log('actualStartTimeTimesheet   : '+actualStartTimeTimesheet);
    console.log('actualEndTimeTimesheet  :  '+actualEndTimeTimesheet);
    console.log('descriptionTimesheet  :  '+descriptionTimesheet);
    
    pool
    .query('INSERT INTO salesforce.Milestone1_Time__c (Projecttimesheet__c, Date__c, Project_Task__c, Representative__c, Start_Time__c, End_Time__c, Description__c) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING sfid',[projectName,dateIncurred,selectedTask,representative,actualStartTimeTimesheet,actualEndTimeTimesheet,descriptionTimesheet])
    .then((timesheetQueryResult) => {
      
      console.log('timesheetQueryResult  '+JSON.stringify(timesheetQueryResult));
      response.send({success : true});
    })
    .catch((timesheetQueryError) => {
      console.log('timesheetQueryError  '+timesheetQueryError.stack)
      response.send({success : false});
    })

 });


 /* router.get('/getdetails',verify, (request, response) => {
        
    console.log('request.user '+JSON.stringify(req.user));
    var userId = req.user.sfid;
    console.log('userId : '+userId);

    var selectedDate = request.query.date;
    console.log('date  '+selectedDate);

    pool
    .query('SELECT Id,sfid, Name, Project_Name__c, Start_Date__c, Planned_Hours__c FROM salesforce.Milestone1_Task__c WHERE Start_Date__c = $1',[selectedDate])
    .then((taskQueryResult) => {
        console.log('Query Result '+JSON.stringify(taskQueryResult.rows));
        console.log('Project ID '+taskQueryResult.rows[0].project_name__c);
        pool
        .query('SELECT sfid, Name FROM salesforce.Milestone1_Project__c WHERE sfid = $1',[taskQueryResult.rows[0].project_name__c])
        .then((projectQueryResult) => {
            console.log('project query '+JSON.stringify(projectQueryResult.rows));

            var taskDetails = [];
            taskQueryResult.rows.forEach((eachTask) => {
                var task = {};
                task.name = eachTask.name;
                task.plannedHours = eachTask.planned_hours__c;
                task.actualHours = '';
                task.date = eachTask.start_date__c;
                projectQueryResult.rows.forEach((eachPro) => {

                        if(eachTask.project_name__c == eachPro.sfid)
                            task.projectName = eachPro.name;
                });
                taskDetails.push(task);
            });
            console.log('taskDetails   '+JSON.stringify(taskDetails));
            response.send(taskDetails);
        })
        .catch((projectQueryError) => {
            console.log('projectQueryError '+JSON.stringify(projectQueryError.stack));
            response.send(403);
        })

    })
    .catch((taskQueryError) => {
        console.log('task Query Error '+taskQueryError.stack);
        response.send(403);
    })

    
 }); */




 router.get('/getdetails',verify, async(request, response) => {
  
  console.log('request.user '+JSON.stringify(request.user));
  var userId = request.user.sfid;
  var userName = request.user.name;
  
  console.log('userId : '+userId+'  userName  : '+userName);
  var selproject=request.query.selproject;
  var selectedDate = request.query.date;
  console.log('date  '+selectedDate);
  console.log('selected project '+selproject);

  var lstTeams=[], teamParam = [];
  var lstTasksToShow = [],contname=[];
  var projectParams = [], projectIDs = [];
  var timesheetParams = [], taskIDs = [];
  var projectMap = new Map();
  var timesheetMap = new Map();
  var lstTaskOfRelatedDate ;
  var lstmember =[];
  
let tskqry='SELECT tsk.Id,tsk.sfid as sfid,tsk.name as tskname,tsk.Project_Name__c, tsk.Start_Date__c,tsk.assigned_manager__c,tsk.Planned_Hours__c,cont.sfid as contid ,cont.name as contname '+
'FROM salesforce.Milestone1_Task__c tsk '+
'INNER JOIN salesforce.Contact cont '+
'ON tsk.assigned_manager__c = cont.sfid '+
'WHERE Start_Date__c = $1 AND tsk.sfid != \''+''+'\'';
console.log('tskqry '+tskqry);
  await
  pool.query(tskqry,[selectedDate])
  .then((taskQueryResult) => {
      console.log('Query Result '+JSON.stringify(taskQueryResult.rows));  
      lstTaskOfRelatedDate = taskQueryResult.rows;
      for(let i=0; i< taskQueryResult.rowCount ; i++)
      {

          projectIDs.push(taskQueryResult.rows[i].project_name__c);
          taskIDs.push(taskQueryResult.rows[i].sfid)
          contname.push(taskQueryResult.rows[i].contname)
          projectParams.push('$'+(i+1));
          timesheetParams.push('$'+(i+1));
      }  

      console.log('projectIDs  : '+projectIDs);
      console.log('taskIDs  : '+taskIDs);
      console.log('projectParams    : '+ projectParams);
      console.log('timesheetParams  : '+timesheetParams);
      console.log('contname    : '+ contname);
      
  })
  .catch((taskQueryError) => {
      console.log('task Query Error '+taskQueryError.stack);
      response.send(403);
  })


  var projectQuery = 'SELECT sfid, Name FROM salesforce.Milestone1_Project__c WHERE sfid IN ('+ projectParams.join(',') +')';
  await
  pool.
  query(projectQuery,projectIDs)
  .then((projectQueryResult) => {
        console.log('projectQueryResult   : '+JSON.stringify(projectQueryResult.rows));
        for(let i=0 ; i < projectQueryResult.rowCount ; i++)
        {
          console.log('projectQueryResult.rows[i].sfid   '+projectQueryResult.rows[i].sfid+'  projectQueryResult.rows[i].name  : '+projectQueryResult.rows[i].name);
          projectMap.set(projectQueryResult.rows[i].sfid, projectQueryResult.rows[i].name);
        }
  })
  .catch((projectQueryError) => {
      console.log('projectQueryError   : '+projectQueryError.stack);
  })


  var timesheetQuery = 'SELECT sfid, date__c, calculated_hours__c, project_Task__c  FROM salesforce.Milestone1_Time__c WHERE sfid != \''+''+'\' AND Project_Task__c IN ('+ timesheetParams.join(',') +')';
  await
  pool.query(timesheetQuery,taskIDs)
  .then((timesheetQueryResult) => {
        console.log('timesheetQueryResult   :  '+JSON.stringify(timesheetQueryResult.rows));
        for(let i=0; i < timesheetQueryResult.rowCount ; i++)
        {
            console.log('timesheetQueryResult.rows[i].project_Task__c   '+timesheetQueryResult.rows[i].project_task__c +' timesheetQueryResult.rows[i].calculated_hours__c  : '+timesheetQueryResult.rows[i].calculated_hours__c);
            timesheetMap.set( timesheetQueryResult.rows[i].project_task__c , timesheetQueryResult.rows[i].calculated_hours__c );
        }
  })
  .catch((timesheetQueryError) => {
        console.log('timesheetQueryError   :  '+timesheetQueryError.stack);
  })

  await
  pool.query('SELECT Id, sfid , Manager__c, name FROM salesforce.Team__c WHERE Manager__c = $1',[userId])
  .then((teamQueryResult)=>{
    console.log('team querry reasult '+JSON.stringify(teamQueryResult.rows));
    if(teamQueryResult.rowCount>0)
      {
      console.log('teamQueryResult team '+JSON.stringify(teamQueryResult.rows));
      console.log('team size '+teamQueryResult.rowCount);
        for(var i = 1; i <= teamQueryResult.rows.length; i++) {
          teamParam.push('$' + i);
          lstTeams.push(teamQueryResult.rows[i-1].sfid);
        } 
   

      console.log(' lstTeams Details'+lstTeams+' teamParam '+teamParam);
      let teamUserQuery='SELECT Id, sfid,Representative__c , team__c FROM salesforce.Team_Member__c WHERE team__c IN ('+ teamParam.join(',')+ ')';
      console.log('teamUserQuery '+teamUserQuery);
      pool
      .query(teamUserQuery,lstTeams)
      .then((memberQueryresult)=>{
        console.log('memberQueryresult '+JSON.stringify(memberQueryresult.rows));
        if(memberQueryresult.rowCount>0)
        {
          memberQueryresult.rows.forEach((eachmember)=>{
          lstmember.push(eachmember);
          })
          console.log('lstmember  '+JSON.stringify(lstmember));
        }
      })
      .catch((errorTeamMemer)=>{
        console.log('erro '+errorTeamMemer.stack);
      })
      }
  })
  .catch((queryErrrpr)=>{
    console.log('team query error '+JSON,stringify(queryErrrpr.stack));
  })


  if(lstTaskOfRelatedDate != null)
  {
      lstTaskOfRelatedDate.forEach((eachTask) => {
            let taskDetail = {};
            taskDetail.name = eachTask.tskname;
            taskDetail.plannedHours = eachTask.planned_hours__c;

            if(timesheetMap.has(eachTask.sfid))
              taskDetail.actualHours = timesheetMap.get(eachTask.sfid);
            else
              taskDetail.actualHours = '';
            console.log('Inside Last Loop timesheetMap.get(eachTask.sfid)    '+timesheetMap.get(eachTask.sfid));
            console.log('start_date__c '+eachTask.start_date__c);
            let dt =eachTask.start_date__c.getTime()+19800000;
            let start_date__c=new Date(dt);
            console.log('start_date__c new '+start_date__c);
            taskDetail.date = start_date__c ;

            if(projectMap.has(eachTask.project_name__c))
              taskDetail.projectName = projectMap.get(eachTask.project_name__c);
            else
              taskDetail.projectName = '';

            console.log('Inside Last Loop  projectMap.get(eachTask.project_Name__c)    '+projectMap.get(eachTask.project_name__c));
          
            taskDetail.userName =eachTask.contname;
            taskDetail.assigned =eachTask.contid;
            taskDetail.currentuser=userName;
            taskDetail.projectid=eachTask.project_name__c;
            console.log('task detail '+JSON.stringify(taskDetail));

            lstTasksToShow.push(taskDetail);
      })
  }
 // lstTasksToShow.push(lstmember);
  console.log('  lstTasksToShow  : '+JSON.stringify(lstTasksToShow));
  response.send(lstTasksToShow);

});



 router.get('/getrelatedtasks',verify,(request, response) => {

   var projectId =  request.query.projectId;
   var selectedDate = request.query.selectedDate;
   console.log('projectId '+projectId + 'selectedDate  : '+selectedDate);

   pool
   .query('SELECT sfid, Name FROM salesforce.Milestone1_Milestone__c WHERE Project__c = $1 AND Name = $2',[projectId, 'Timesheets'])
   .then((projectMilestoneQueryResult) => {
       console.log('projectMilestoneQueryResult  : '+JSON.stringify(projectMilestoneQueryResult.rows));
         
        pool
       .query('SELECT id, sfid, Name FROM salesforce.Milestone1_Task__c WHERE Project_Milestone__c = $1 AND Start_Date__c = $2 AND Assigned_Manager__c=$3 And sfid != \''+''+'\'',[projectMilestoneQueryResult.rows[0].sfid, selectedDate,request.user.sfid])
       .then((taskQueryResult) => { 
            console.log('taskQueryResult  : '+JSON.stringify(taskQueryResult.rows));
            response.send(taskQueryResult.rows);
       })
       .catch((taskQueryError) => {
            console.log('taskQueryError  : '+taskQueryError.stack);
            response.send(403);
       })

   })
   .catch((projectMilestoneQueryError) => {
        console.log('projectMilestoneQueryError  :  '+projectMilestoneQueryError.stack);
        response.send(403);
   })

 });


 /************************************************    Task List View   **************************************/

 router.get('/taskListView',verify,(request,response)=>{
  let objUser = request.user;
  console.log('objUser  : '+JSON.stringify(objUser));
  response.render('./timesheets/taskListView',{objUser});
})

router.get('/getTasklist',verify,(request,response)=>{
  let objUser=request.user;
  console.log('objUser.sfid '+objUser.sfid);
  let queryText = 'SELECT tsk.sfid as sfids, tsk.Assigned_Manager__c as assManager,tsk.end_time__c,tsk.Task_Type__c,tsk.Planned_Hours__c,tsk.Start_Time__c,tsk.name as tskname,tsk.createddate '+
                   'FROM salesforce.Milestone1_Task__c tsk '+ 
                   'WHERE  tsk.Assigned_Manager__c= $1 '+
                   'AND sfid IS NOT NULL ';
 console.log('queryText  taskkkkkkkkkkkkkkkkkkk',queryText);
  pool
   .query(queryText,[objUser.sfid])
  .then((taskQueryResult)=>{
    console.log('taskQueryResult '+JSON.stringify(taskQueryResult.rows) +'Row COUNT => '+taskQueryResult.rowCount);
    if(taskQueryResult.rowCount > 0)
    {
        let modifiedTaskList = [],i =1;
        taskQueryResult.rows.forEach((eachRecord) => {
          let obj = {};
          let createdDate = new Date(eachRecord.createddate);
          let strDate = createdDate.toLocaleString();
          obj.sequence = i;
          obj.name = '<a href="#" class="taskreferenceTag" id="'+eachRecord.sfids+'" >'+eachRecord.tskname+'</a>';
          obj.assigned = eachRecord.assmanager;
          obj.hrs=eachRecord.planned_hours__c;
          obj.startTime=eachRecord.start_time__c;
          obj.endtime=eachRecord.end_time__c;
          obj.taskType=eachRecord.task_type__c;
          obj.createDdate = strDate;
          obj.editAction = '<button href="#" class="btn btn-primary editTask" id="'+eachRecord.sfids+'" >Edit</button>'
          i= i+1;
          modifiedTaskList.push(obj);
        })
        response.send(modifiedTaskList);
    }
    else
    {
        response.send([]);
    }

  })
  .catch((QueryError) => {
    console.log('QueryError  timeshheer=t'+QueryError.stack);
  }) 
})
router.get('/fetchTaskDetail',verify,(request,response)=>{
  let tskId=request.query.taskId;
  console.log('task ID '+tskId);
  pool
  .query('select sfid,name ,Assigned_Manager__c ,end_time__c,Task_Type__c,Planned_Hours__c,Start_Time__c FROM salesforce.Milestone1_Task__c where sfid=$1 ',[tskId])
  .then((querryResult)=>{
    console.log('QUERRY rESULT'+ JSON.stringify(querryResult.rows));
    response.send(querryResult.rows);
  })
  .catch((querryError)=>{
    console.log('querryError '+querryError);
    response.send(querryError.stack)
})
})

router.post('/updateTask',verify,(request,response)=>{
  let body=request.body;
  console.log('Body '+ JSON.stringify(body));
  const {start,endTime , taskType, hrs, hide} = request.body;
  console.log('start '+ start);
  console.log('endTime '+ endTime);
  console.log('taskType '+ taskType);
  console.log('hr '+ hrs);
  console.log('hide '+ hide);
  let updateQuery= 'UPDATE salesforce.Milestone1_Task__c SET '+
                    'end_time__c = \''+endTime+'\', '+
                    'start_time__c = \''+start+'\', '+
                    'task_type__c = \''+taskType+'\' '+
                       'WHERE sfid = $1';
  console.log('updateQuerryyyyy '+updateQuery);
  pool
  .query(updateQuery,[hide])
  .then((queryResult)=>{
    console.log('queryResult '+JSON.stringify(queryResult.rows));
    response.send('successsss')
    .catch((querryError)=>{
      console.log('querryError'+querryError.stack);
      response.send(querryError);
    })
  })
})
/*****************************************   Task List View End  ********************************/

/*****************************************   Timesheet List View Start ********************************/

router.get('/timesheetListView',verify,(request,response)=>{
  let objUser = request.user;
  console.log('objUser  : '+JSON.stringify(objUser));
  response.render('./timesheets/timesheetListView',{objUser});
})

router.get('/getTimesheetlist',verify,(request,response)=>{
  let objUser=request.user;
  console.log('objUser.sfid '+objUser.sfid);
  let queryText = 'SELECT sfid, Date__c,end_time__c,Hours__c,	Start_Time__c,name,Incurred_By__c,representative__c,createddate '+
                   'FROM salesforce.Milestone1_Time__c  '+ 
                   'WHERE  representative__c= $1 '+
                   'AND sfid IS NOT NULL ' ;
 console.log('queryText timesheetList',queryText);
  pool
  .query(queryText,[objUser.sfid])
  .then((timesheetQueryResult)=>{
    console.log('timesheetQueryResult '+JSON.stringify(timesheetQueryResult));
    if(timesheetQueryResult.rowCount > 0 && timesheetQueryResult.rows)
    {
        let modifiedList = [],i =1;
        timesheetQueryResult.rows.forEach((eachRecord) => {
          
          let obj = {};
          let createdDate = new Date(eachRecord.createddate);
          let strDate = createdDate.toLocaleString();
          let strDated = new Date(eachRecord.createddate);
          let strDated1 = strDated.toLocaleString();
          obj.sequence = i;
          obj.name = '<a href="#" class="taskreferenceTag" id="'+eachRecord.sfid+'" >'+eachRecord.name+'</a>';
          obj.hours=eachRecord.hours__c;
          obj.startTime=eachRecord.start_time__c;
          obj.endtime=eachRecord.end_time__c;
          obj.date=strDated1;
          obj.createDdate = strDate;
          obj.editAction = '<button href="#" class="btn btn-primary editTimesheet" id="'+eachRecord.sfid+'" >Edit</button>'
          i= i+1;
          modifiedList.push(obj);
          
        })
        response.send(modifiedList);
    }
    else
    {
        response.send([]);
    }

  })
  .catch((QueryError) => {
    console.log('QueryError  '+QueryError.stack);
    response.send(querryError);
  }) 
})
  
router.get('/fetchtimesheetkDetail',verify,(request,response)=>{
  let timesheetId= request.query.timesheetId;
  console.log('timesheet ID '+timesheetId);
 /*  let queryText = ;
console.log('queryText '+queryText); */
pool
.query('SELECT sfid,date__c,end_time__c,Hours__c,Start_Time__c,name,Incurred_By__c,representative__c,createddate FROM salesforce.Milestone1_Time__c WHERE sfid= $1 ',[timesheetId])
.then((querryResult)=>{
  console.log('queryrResult fetchqueryrResult fetchqueryrResult fetchqueryrResult fetch'+JSON.stringify(querryResult.rows));
  response.send(querryResult.rows);
})
.catch((QueryError)=>{
  console.log('querryError '+querryError.stack);
  response.send(querryError);
})
});

router.post('/updateTimesheet',verify,(request,response) => {

  let body=request.body;
  console.log('Body '+ JSON.stringify(body));
  const {start,endTime , dt, hr, hide} = request.body;
  console.log('start '+ start);
  console.log('endTime '+ endTime);
  console.log('dt '+ dt);
  console.log('hr '+ hr);
  console.log('hide '+ hide);
  let updateQuery= 'UPDATE salesforce.Milestone1_Time__c SET '+
                    'end_time__c = \''+endTime+'\', '+
                    'Start_Time__c = \''+start+'\', '+
                       'date__c = \''+dt+'\' '+
                       'WHERE sfid = $1';
  console.log('update Querry'+updateQuery);
  pool
  .query(updateQuery,[hide])
  .then((querryResult)=>{
    console.log('querryResult '+JSON.stringify(querryResult));
    response.send('Success');
  })
  .catch((querryError)=>{
    console.log('querryError'+querryError.stack);
    response.send(querryError);
  })
});

/*****************************************   Timesheet List View End ********************************/
 


module.exports = router;




