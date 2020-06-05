const Router = require('express-promise-router');
const router = new Router()
const pool = require('../db/dbConfig');
const verify = require('../config/verifyToken');
const format = require('pg-format');
const joi = require('@hapi/joi');


router.get('/tourBillClaimListview',verify,(request, response) => {

    let objUser = request.user;
    let expenseId = request.query.expenseId;

    console.log('Tour Bill expenseId  :'+expenseId);
    console.log('Tour Bill objUser  :'+JSON.stringify(objUser));

    pool.query('SELECT Id, sfid, Name, Expense__c, Grand_Total__c,Grand__c FROM salesforce.Tour_Bill_Claim__c WHERE Expense__c = $1 ',[expenseId])
    .then((tourBillClaimResult) => {
        console.log('tourBillClaimResult '+JSON.stringify(tourBillClaimResult.rows));
        //response.send(tourBillClaimResult.rows);
        //response.render('tourBillExpenses',{ name : request.user.name, email : request.user.email, tourBillClaimRows : tourBillClaimResult.rows ,parentExpenseId : parentExpenseId});
        response.render('./expenses/tourBillClaims/TourBillClaimListView',{objUser,expenseId});
    })
    .catch((tourBillClaimError) => {
        console.log('Tour Bill Claim Query Error '+tourBillClaimError.stack);
        //response.render('tourBillExpenses',{ name : request.user.name, email : request.user.email, tourBillClaimRows : [] ,parentExpenseId : ''});
        response.render('./expenses/tourBillClaims/TourBillClaimListView',{objUser,expenseId});
    }) 

   
});


router.get('/gettourbillclaim',verify,(request,response)=>{
    let objUser = request.user;
    console.log('objUser TourBill : '+JSON.stringify(objUser));
    let expenseId = request.query.expenseId;
    console.log('expenseId TourBill '+expenseId);
    pool
    .query('SELECT sfid, name, grand_Total__c ,createddate, Grand__c from salesforce.Tour_Bill_Claim__c WHERE expense__c = $1',[expenseId])
    .then((tourBillClaimResult)=>{
      console.log('tourBillClaimResult '+tourBillClaimResult.rows);
      if(tourBillClaimResult.rowCount>0)
      {
            let modifiedTourBillList = [],i =1; 
        tourBillClaimResult.rows.forEach((eachRecord) => {
          let obj = {};
          let createdDate = new Date(eachRecord.createddate);
          let strDate = createdDate.toLocaleString();
          obj.sequence = i;
          obj.name = '<a href="'+eachRecord.sfid+'"  data-toggle="modal" data-target="#popup" class="tourBillId"  id="" >'+eachRecord.name+'</a>';
          obj.grandTotal = eachRecord.grand__c;
          obj.createDdate = strDate;
          i= i+1;
          modifiedTourBillList.push(obj);
        })
        response.send(modifiedTourBillList); 
      }
      else{
        response.send([]);
      }
    })
    .catch((tourBillClaimQueryError)=>{
      console.log('tourBillClaimQueryError '+tourBillClaimQueryError.stack);
    })
  
  })


router.post('/saveTourBillClaim',(request, response) => {

    console.log('okok');
    let {tourBillClaimName, parentExpenseId } = request.body;
    console.log('tourBillClaimName  '+tourBillClaimName+ ' parentExpenseId : '+parentExpenseId);
    console.log('tourBillClaimFormData  '+JSON.stringify(request.body));

    pool.query('INSERT INTO salesforce.Tour_Bill_Claim__c (name, expense__c) values($1, $2) returning id',[tourBillClaimName,parentExpenseId])
    .then((tourBillClaimInsertResult) => {
            console.log('tourBillClaimInsertResult '+JSON.stringify(tourBillClaimInsertResult));
            response.send('Success');
    })
    .catch((tourBillClaimInsertError) => {
        console.log('tourBillClaimInsertError  '+tourBillClaimInsertError.stack);
        response.send('Error Occured  !');
    })

})


router.get('/getRelatedTourBillClaimDetails/:tourBillClaimId', async (request, response) => {

    console.log('getRelatedTourBillClaimDetails  called !');
    var tourBillClaimId = request.params.tourBillClaimId; //request.query.tourBillClaimId;
    console.log('tourBillClaimId  KKKKKKKKKKKKKK '+tourBillClaimId);
    var objTourbillClaimRelatedData = {};
    let tourBillClaimQuery = 'SELECT Id,sfid,name ,expense__c, Grand_Total__c, Grand__c  '+
                             'FROM salesforce.Tour_Bill_Claim__c WHERE sfid = $1 ';
                                
    await
    pool.query(tourBillClaimQuery,[tourBillClaimId])
    .then((tourBillClaimResult) => {
        console.log('tourBillClaimResult '+JSON.stringify(tourBillClaimResult.rows));
        
        if(tourBillClaimResult.rowCount > 0)
        {
            objTourbillClaimRelatedData.tourBillClaim = tourBillClaimResult.rows[0];
        }
        
    })
    .catch((tourBillClaimError) => {
        console.log('Tour Bill Claim Query Error '+tourBillClaimError.stack);
        //response.send(403);
    }) 


    var airRailBusQuery = 'SELECT sfid, Name, Departure_Date__c, Arrival_Date__c, Departure_Station__c,'+ 
    'Arrival_Station__c, Amount__c, Tour_Bill_Claim__c, Activity_Code__c, Project_Tasks__c '+
    'FROM salesforce.Air_Rail_Bus_Fare__c WHERE Tour_Bill_Claim__c = $1';
    await 
    pool
    .query(airRailBusQuery,[tourBillClaimId])
    .then((airRailBusQueryResult) => {
        console.log('airRailBusQueryResult.rows '+JSON.stringify(airRailBusQueryResult.rows));
        
        if(airRailBusQueryResult.rowCount > 0)
        {
            objTourbillClaimRelatedData.airBusRailFare = airRailBusQueryResult.rows;
        }
        
    })
    .catch((airRailBusQueryError) => {
    console.log('airRailBusQueryError '+airRailBusQueryError.stack);
    })



    var conveyanceChargesQuery = 'SELECT sfid, Name, Date__c, Amount__c, Place__c,'+ 
                          'Remarks__c, Tour_Bill_Claim__c, Activity_Code__c, Project_Tasks__c, Heroku_Image_URL__c  '+
                          'FROM salesforce.Conveyance_Charges__c WHERE Tour_Bill_Claim__c = $1';
    await
    pool
    .query(conveyanceChargesQuery,[tourBillClaimId])
    .then((conveyanceChargesQueryResult) => {
        console.log('conveyanceChargesQueryResult.rows '+JSON.stringify(conveyanceChargesQueryResult.rows));

        if(conveyanceChargesQueryResult.rowCount > 0)
        {
            objTourbillClaimRelatedData.conveyanceCharges = conveyanceChargesQueryResult.rows;
        }
    })
    .catch((conveyanceChargesQueryError) => {
        console.log('conveyanceChargesQueryError '+conveyanceChargesQueryError.stack);
    })


    var boardingLodgingChargesQuery = 'SELECT sfid, Name, Tour_Bill_Claim__c, Stay_Option__c, Place_Journey__c,'+ 
                          'Correspondence_City__c, Activity_Code__c, Own_Stay_Amount__c, Project_Tasks__c , From__c, To__c,'+
                          'No_of_Days__c,Heroku_Image_URL__c,Daily_Allowance__c,Amount_of_B_L_as_per_policy__c Total_time__c, Actual_Amount_for_boarding_and_lodging__c, Amount_for_boarding_and_lodging__c,'+
                          'Total_Amount__c, Extra_Amount__c, Total_Allowance__c '+
                          'FROM salesforce.Boarding_Lodging__c WHERE Tour_Bill_Claim__c = $1';
    await
    pool
    .query(boardingLodgingChargesQuery,[tourBillClaimId])
    .then((boardingLodgingChargesQueryResult) => {
        console.log('boardingLodgingChargesQueryResult.rows '+JSON.stringify(boardingLodgingChargesQueryResult.rows));
        if(boardingLodgingChargesQueryResult.rowCount > 0)
        {
            objTourbillClaimRelatedData.boardingLodgingCharges = boardingLodgingChargesQueryResult.rows;
        }
    })
    .catch((boardingLodgingChargesQueryError) => {
        console.log('boardingLodgingChargesQueryError '+boardingLodgingChargesQueryError.stack);
    })


    var telephoneFoodQuery = 'SELECT sfid, Name, Laundry_Expense__c, Fooding_Expense__c, Remarks__c,'+ 
                          'Tour_Bill_Claim__c, Activity_Code__c, Project_Tasks__c, Total_Amount__c '+
                          'FROM salesforce.Telephone_Fooding_Laundry_Expenses__c WHERE Tour_Bill_Claim__c = $1';
    await
    pool
    .query(telephoneFoodQuery,[tourBillClaimId])
    .then((telephoneFoodQueryResult) => {
        console.log('telephoneFoodQueryResult.rows '+JSON.stringify(telephoneFoodQueryResult.rows));
        if(telephoneFoodQueryResult.rowCount > 0)
        {
            objTourbillClaimRelatedData.telephoneFoodCharges = telephoneFoodQueryResult.rows;
        }
    })
    .catch((telephoneFoodQueryError) => {
        console.log('telephoneFoodQueryError '+telephoneFoodQueryError.stack);
    })


    var miscellenousChargesQuery = 'SELECT sfid, Name, Date__c, Amount__c, Particulars_Mode__c,'+ 
    'Remarks__c, Activity_Code__c, Tour_Bill_Claim__c, Project_Tasks__c, Heroku_Image_URL__c '+
    'FROM salesforce.Miscellaneous_Expenses__c WHERE Tour_Bill_Claim__c = $1';
    await
    pool
    .query(miscellenousChargesQuery,[tourBillClaimId])
    .then((miscellenousChargesQueryResult) => {
        console.log('miscellenousChargesQueryResult.rows '+JSON.stringify(miscellenousChargesQueryResult.rows));
        if(miscellenousChargesQueryResult.rowCount > 0)
        {
            objTourbillClaimRelatedData.miscellenousCharges = miscellenousChargesQueryResult.rows;
        }
    })
    .catch((miscellenousChargesQueryError) => {
    console.log('miscellenousChargesQueryError '+miscellenousChargesQueryError.stack);
    })
    

    console.log('objTourbillClaimRelatedData   '+JSON.stringify(objTourbillClaimRelatedData));
    response.send(objTourbillClaimRelatedData);

});

/************************************* Start Air Rail Bus ******************************************************************* */


router.get('/getAirBusListView',verify,(request,response)=>{
    let objUser = request.user;
    console.log('objUser  : '+JSON.stringify(objUser));
    let tourbillId = request.query.tourBillClaimId;
  
    console.log('getAirBusListView tourbillId:'+tourbillId);
    
  
    response.render('./expenses/tourBillClaims/airRailBusListView', {objUser, tourbillId});
});

  
  router.get('/getAirbusDetalList',verify,(request,response)=>{
     let objUser = request.user;
    console.log('objUser  : '+JSON.stringify(objUser));
    let tourbillId = request.query.tourbillId;
    console.log('TourbillId'+tourbillId);
    pool
    .query('SELECT sfid, name, Amount__c,Departure_Station__c,Arrival_Station__c , departure_date__c, arrival_date__c, createddate from salesforce.Air_Rail_Bus_Fare__c WHERE Tour_Bill_Claim__c = $1',[tourbillId])
    .then((airBusQueryResult)=>{
      console.log('airBusQueryResult '+airBusQueryResult.rows);
      if(airBusQueryResult.rowCount>0)
      {
            let modifiedAirBuslList = [],i =1; 
            airBusQueryResult.rows.forEach((eachRecord) => {
          let obj = {};
          let createdDate = new Date(eachRecord.createddate);
          createdDate.setHours(createdDate.getHours() + 5);
          createdDate.setMinutes(createdDate.getMinutes() + 30);
          let strDate = createdDate.toLocaleString();
          let departDate = new Date(eachRecord.departure_date__c);
          departDate.setHours(departDate.getHours() + 5);
          departDate.setMinutes(departDate.getMinutes() + 30);
          let strDepartDate = departDate.toLocaleString();
          let arriDate = new Date(eachRecord.arrival_date__c);
          arriDate.setHours(arriDate.getHours() + 5);
          arriDate.setMinutes(arriDate.getMinutes() + 30);
          let strarriDate = arriDate.toLocaleString();

          obj.sequence = i;
          obj.departure=eachRecord.departure_station__c
          obj.name = '<a href="#" class="airRailBusTag" id="'+eachRecord.sfid+'" >'+eachRecord.name+'</a>';
          obj.amount = eachRecord.amount__c;
          obj.createDdate = strDate;
          obj.arrival=eachRecord.arrival_station__c;
          obj.editAction = '<button href="#" class="btn btn-primary editAirRailBus" id="'+eachRecord.sfid+'" >Edit</button>'
  
          i= i+1;
          modifiedAirBuslList.push(obj);
        })
        response.send(modifiedAirBuslList); 
      }
      else{
        response.send([]);
      }
    })
    .catch((airBusQuerryError)=>{
  
    })
  });
  
  router.get('/getAirRailBus',verify,(request,response)=>{
    let tourbillId = request.query.tourbillId;
    console.log('tourbillId  : '+tourbillId);
    
    let queryText = 'SELECT airRail.sfid,airRail.Activity_Code__c,airRail.Project_Tasks__c, airRail.Heroku_Image_URL__c,airRail.Departure_Station__c,airRail.arrival_station__c,airRail.Departure_Date__c,airRail.Arrival_Date__c, airRail.amount__c, airRail.name as airbusrailname ,tourBill.sfid  as tourId ,tourBill.name as tourbillname,airRail.createddate '+
                     'FROM salesforce.Air_Rail_Bus_Fare__c airRail '+ 
                     'INNER JOIN salesforce.Tour_Bill_Claim__c tourBill '+
                     'ON airRail.Tour_Bill_Claim__c =  tourBill.sfid '+
                     'WHERE  airRail.sfid= $1 ';
  
    pool
    .query(queryText,[tourbillId])
    .then((AirRailBusQueryResult) => {
          console.log('AirRailBusQueryResult  '+JSON.stringify(AirRailBusQueryResult.rows));
          if(AirRailBusQueryResult.rowCount > 0)
          {
            response.send(AirRailBusQueryResult.rows);
          }
          else
          {
            response.send([]);
          }
           
    })
    .catch((AirRailBusQueryError) => {
          console.log('AirRailBusQueryError  '+AirRailBusQueryError.stack);
          response.send([]);
    })
  
  });


  router.post('/updateAirRailBus',verify,(request,response)=>{

    let body = request.body;
    console.log('body  : '+JSON.stringify(body));
    const {airBusName,tourName , departureStation, departureDate,arrivalStation,arrivalDate,amount,hide} = request.body;
    console.log('name  '+airBusName);
    console.log('TourbillId  '+tourName);
    console.log('Amount  '+amount);
    console.log('departureStation  '+departureStation);
    console.log('departureDate '+departureDate);
    console.log('arrivalDate '+arrivalDate);
    console.log('arrivalStation '+arrivalStation);
    console.log(' Coveyance ID '+hide);
    let updateQuerry = 'UPDATE salesforce.Air_Rail_Bus_Fare__c SET '+
                         'arrival_station__c = \''+arrivalStation+'\', '+
                         'departure_station__c = \''+departureStation+'\', '+
                         'departure_date__c = \''+departureDate+'\', '+
                         'arrival_date__c = \''+arrivalDate+'\' '+
                        // 'total_amount__c = \''+amount+'\' '+
                         'WHERE sfid = $1';
  console.log('updateQuerry  '+updateQuerry);
    pool
    .query(updateQuerry,[hide])
    .then((AirBusRailInsertResult) => {     
             console.log('AirBusRailInsertResult '+JSON.stringify(AirBusRailInsertResult));
             response.send('Success');
    })
    .catch((updatetError) => {
         console.log('updatetError   '+updatetError.stack);
         response.send('Error');
    })
  })
  

router.get('/airRailBusCharges/:parentTourBillId',verify,(request, response) => {
    
     let objUser=request.user;
     let parentTourBillId = request.params.parentTourBillId; 
     response.render('./expenses/tourBillClaims/airRailBusCharges',{objUser, parentTourBillId :parentTourBillId});

});


router.post('/airRailBusCharges',verify, (request, response) => {

  var bdy = request.body;
  var bodyResult = request.body;  
  console.log('airRailBusCharges Body'+JSON.stringify(bodyResult));
 /*  const schema = joi.object({
      departure_Date:joi.date().max('now').label('departure_Date must be less than Today').required(),
      arrival_Date:joi.date().less(joi.ref('departure_Date')).label('Arrival Date must be less than departure_Date').required(),
      amount:joi.number().required().label('Amount cannot be null'),
      arrival_Station:joi.string().required().label('Please fill Arrivial Statton'),
      departure_Station:joi.string().required().label('Please fill Departure Station'),
      imgpath:joi.string().invalid('deme').required().label('Upload your File/Attachment'),
  })
  let Result=schema.validate({departure_Date:bdy.departure_Date,arrival_Date:bdy.arrival_Date,amount:bdy.amount,arrival_Station:bdy.arrival_Station,departure_Station:bdy.departure_Station,imgpath:bdy.imgpath});
  console.log('validaton result '+JSON.stringify(Result.error));
  if(Result.error)
  {
      console.log('fd'+Result.error)
      response.send(Result.error.details[0].context.label);
  } */

      let parentTourBillClaimId='';
      let numberOfRows; let lstAirRailBus= [];
      if(typeof(bodyResult.arrival_Date) == 'object')
      {
          numberOfRows = bodyResult.arrival_Date.length;
          for(let i=0; i<numberOfRows ;i++)
          {

            const schema = joi.object({
              arrival_Dt:joi.date().label('plz enter the Arrival Date less tha n Departure date and Today '),
              departure_Date:joi.date().max('now').label('departure_Date must be less than Today').required(),
              arrival_Date:joi.date().less(joi.ref('departure_Date')).label('Arrival Date must be less than departure_Date').required(),
              projectTask:joi.string().required().label('Select Activity Code '),
              arrival_Station:joi.string().required().label('Please fill Arrivial Statton'),
              departure_Station:joi.string().required().label('Please fill Departure Station'),
              amount:joi.number().required().label('Amount cannot be null'),
              imgpath:joi.string().invalid('deme').required().label('Upload your File/Attachment'),
          })
          let Result=schema.validate({projectTask:bdy.projectTask[i],arrival_Dt:bdy.arrival_Date[i],departure_Date:bdy.departure_Date[i],arrival_Date:bdy.arrival_Date[i],amount:bdy.amount[i],arrival_Station:bdy.arrival_Station[i],departure_Station:bdy.departure_Station[i],imgpath:bdy.imgpath[i]});
          console.log('validaton result '+JSON.stringify(Result.error));
                if(Result.error)
                {
                  console.log('fd'+Result.error);
                   response.send(Result.error.details[0].context.label);
               }

               else
               {
                parentTourBillClaimId = bodyResult.parentTourBillId[i];
                 let airRailBusSingleRecordValues = [];
                 airRailBusSingleRecordValues.push(bodyResult.arrival_Date[i]);
                 airRailBusSingleRecordValues.push(bodyResult.departure_Date[i]);
                 airRailBusSingleRecordValues.push(bodyResult.activity_code[i]);
                 airRailBusSingleRecordValues.push(bodyResult.arrival_Station[i]);
                 airRailBusSingleRecordValues.push(bodyResult.departure_Station[i]);
                 airRailBusSingleRecordValues.push(bodyResult.amount[i]);
                 airRailBusSingleRecordValues.push(bodyResult.imgpath[i]);
                 airRailBusSingleRecordValues.push(bodyResult.parentTourBillId[i]);
                 lstAirRailBus.push(airRailBusSingleRecordValues);
               }
          }
     }
      else
      {
          numberOfRows = 1;
          for(let i=0; i<numberOfRows ;i++)
          { 
            const schema = joi.object({
              arrival_Dt:joi.date().required().label('Please fill arrival date LEss tha Today and Departure date'),
              arrival_Date:joi.date().less(joi.ref('departure_Date')).label('departure_Date  must be greter than Arrivaldate').required(),
              departure_Date:joi.date().max('now').label('departure_Date must be less than Today').required(),
              projectTask:joi.string().required().label('Select Activity Code '),
              arrival_Station:joi.string().required().label('Please fill Arrivial Statton'),
              departure_Station:joi.string().required().label('Please fill Departure Station'),
              amount:joi.number().required().label('Amount cannot be null'),
              imgpath:joi.string().invalid('demo').required().label('Upload your File/Attachment'),
          })
          let Result=schema.validate({projectTask:bdy.projectTask,arrival_Dt:bdy.arrival_Date,arrival_Date:bdy.arrival_Date,departure_Date:bdy.departure_Date,amount:bdy.amount,arrival_Station:bdy.arrival_Station,departure_Station:bdy.departure_Station,imgpath:bdy.imgpath});
          console.log('validaton result '+JSON.stringify(Result.error));
          if(Result.error)
          {
              console.log('fd'+Result.error)
              response.send(Result.error.details[0].context.label);
          } 
          else
          {     
            let airRailBusSingleRecordValues = [];
            parentTourBillClaimId = bodyResult.parentTourBillId;
            airRailBusSingleRecordValues.push(bodyResult.arrival_Date);
            airRailBusSingleRecordValues.push(bodyResult.departure_Date);
            airRailBusSingleRecordValues.push(bodyResult.activity_code);
            airRailBusSingleRecordValues.push(bodyResult.arrival_Station);
            airRailBusSingleRecordValues.push(bodyResult.departure_Station);
            airRailBusSingleRecordValues.push(bodyResult.amount);
            airRailBusSingleRecordValues.push(bodyResult.imgpath);
            airRailBusSingleRecordValues.push(bodyResult.parentTourBillId);
            lstAirRailBus.push(airRailBusSingleRecordValues);

          }
   
          }
      }
      console.log('lstAirRailBus Final Result  '+JSON.stringify(lstAirRailBus));
      let airRailBusInsertQuery = format('INSERT INTO salesforce.Air_Rail_Bus_Fare__c (Arrival_Date__c, Departure_Date__c,Activity_Code__c,Arrival_Station__c,Departure_Station__c,Amount__c,heroku_image_url__c,Tour_Bill_Claim__c) VALUES %L returning id', lstAirRailBus);
  
      pool.query(airRailBusInsertQuery)
      .then((airRailBusQueryResult) => {
              console.log('airRailBusQueryResult  '+JSON.stringify(airRailBusQueryResult.rows));
            response.send('AirRailBus Form Saved Successfully !');
            //  request.flash('success_msg', 'Air Rail Bus Created Successfully');
           //   response.redirect('/expense/tourBillClaim/getAirBusListView?tourBillClaimId='+parentTourBillClaimId);
      })
      .catch((airRailBusQueryError) => {
              console.log('airRailBusQueryError  '+airRailBusQueryError.stack);
              response.send('Error Occured While Saving !');
      })
  
});

/*************************************End Air Rail Bus ******************************************************************* */

/*************************************Start  tourBillConveyanceCharges ******************************************************************* */
router.get('/conveyanceCharges/:parentTourBillId',verify, (request, response) => {

    let objUser=request.user;
    let parentTourBillId = request.params.parentTourBillId;
    console.log('conveyanceCharges parentTourBillId  : '+request.params.parentTourBillId);

    var conveyanceChargesQuery = 'SELECT sfid, Name, Date__c, Amount__c, Place__c,'+ 
                          'Remarks__c, Tour_Bill_Claim__c, Activity_Code__c, Project_Tasks__c '+
                          'FROM salesforce.Conveyance_Charges__c WHERE Tour_Bill_Claim__c = $1';
    pool
    .query(conveyanceChargesQuery,[parentTourBillId])
    .then((conveyanceChargesQueryResult) => {
        console.log('conveyanceChargesQueryResult.rows '+JSON.stringify(conveyanceChargesQueryResult.rows));
    })
    .catch((conveyanceChargesQueryError) => {
        console.log('conveyanceChargesQueryError '+conveyanceChargesQueryError.stack);
    })

    response.render('./expenses/tourBillClaims/tourBillConveyanceCharges',{objUser, parentTourBillId :parentTourBillId});
});

router.post('/conveyanceCharges',verify, (request, response) => {

  let bodyResult =  request.body;
  console.log('conveyanceCharges bodyResult  : '+JSON.stringify(bodyResult));
  console.log('typeof(request.body.date)   : '+typeof(request.body.date));
  
/* const schema = joi.object({
  date:joi.date().max('now').required().label('Date should be less than Today'),
  place:joi.string().required().label('Enter your Place'), 
    amount:joi.number().required().label('Amount cannot be Null'),
    imgpath:joi.string().invalid('demo').label('Upload your File/Attachments').required(),
//  activity_code:joi.required,
})
  
  let result= schema.validate({date:bodyResult.date,place:bodyResult.place,imgpath:bodyResult.imgpath,amount:bodyResult.amount});
if(result.error)
{
  console.log('fd'+result.error)
      response.send(result.error.details[0].context.label);
}
*/

  let numberOfRows ;  let lstConveyanceCharges = [];
  if(typeof(request.body.date) == 'object')
  {
      numberOfRows = request.body.date.length;
      console.log('numberOfRows  '+numberOfRows);
     
      for(let i=0; i < numberOfRows ;i++)
      {
          const schema = joi.object({
          date:joi.date().max('now').required().label('Date should be less than Today'),
          place:joi.string().required().label('Enter your Place'), 
          projectTask:joi.string().required().label('Please select the ActivityCode'),
          amount:joi.number().required().label('Amount cannot be Null'),
          imgpath:joi.string().valid('demo').label('Upload your File/Attachments').required(),
        //  activity_code:joi.required,
            })
            let result= schema.validate({projectTask:bodyResult.projectTask[i],date:bodyResult.date[i],place:bodyResult.place[i],imgpath:bodyResult.imgpath[i],amount:bodyResult.amount[i]});
            if(result.error)
            {
                console.log('fd'+result.error)
                    response.send(result.error.details[0].context.label);
            }
            else{

              let singleConveyanceRecord = [];
              singleConveyanceRecord.push(bodyResult.date[i]);
              console.log('index : '+i+'  bodyResult.date[i]  '+bodyResult.date[i]);
              singleConveyanceRecord.push(bodyResult.place[i]);
              console.log('index : '+i+'  bodyResult.place[i]  '+bodyResult.place[i]);
              singleConveyanceRecord.push(bodyResult.activity_code[i]);
              console.log('index : '+i+'  bodyResult.activity_code[i] '+bodyResult.activity_code[i]);
              singleConveyanceRecord.push(bodyResult.remarks[i]);
              console.log('index : '+i+'  bodyResult.remarks[i]  '+bodyResult.remarks[i]);
              singleConveyanceRecord.push(bodyResult.amount[i]);
              console.log('index : '+i+'  bodyResult.amount[i] '+bodyResult.amount[i]);
              singleConveyanceRecord.push(bodyResult.imgpath[i]);
              console.log('index : '+i+'  bodyResult.imgpath[i]  '+bodyResult.imgpath[i]);
              singleConveyanceRecord.push(bodyResult.parentTourBillId[i]);
              console.log('index : '+i+'  bodyResult.parentTourBillId[i]  '+bodyResult.parentTourBillId[i]);
              lstConveyanceCharges.push(singleConveyanceRecord);
            }
             
      }
      console.log('lstConveyanceCharges  : '+JSON.stringify(lstConveyanceCharges));
  }  
  else
  {
      numberOfRows = 1;
      for(let i=0; i < numberOfRows ;i++)
      {
        const schema = joi.object({
          date:joi.date().max('now').required().label('Date should be less than Today'),
          place:joi.string().required().label('Enter your Place'), 
          projectTask:joi.string().required().label('Select The Activity Code'),
            amount:joi.number().required().label('Amount cannot be Null'),
            imgpath:joi.string().valid('demo').label('Upload your File/Attachments').required(),
        //  activity_code:joi.required,
      })
          
          let result= schema.validate({projectTask:bodyResult.projectTask,date:bodyResult.date,place:bodyResult.place,imgpath:bodyResult.imgpath,amount:bodyResult.amount});
      if(result.error)
      {
          console.log('fd'+result.error)
              response.send(result.error.details[0].context.label);
      }
      else{
        let singleConveyanceRecord = [];
              singleConveyanceRecord.push(bodyResult.date);
              singleConveyanceRecord.push(bodyResult.place);
              singleConveyanceRecord.push(bodyResult.activity_code);
              singleConveyanceRecord.push(bodyResult.remarks);
              singleConveyanceRecord.push(bodyResult.amount);
              singleConveyanceRecord.push(bodyResult.imgpath);
              singleConveyanceRecord.push(bodyResult.parentTourBillId);
              lstConveyanceCharges.push(singleConveyanceRecord);
      }
    }               
      console.log('lstConveyanceCharges  : '+JSON.stringify(lstConveyanceCharges));
  }
      
  let conveyanceChargesInsertQuery = format('INSERT INTO salesforce.Conveyance_Charges__c  (Date__c, Place__c, Activity_Code__c,Remarks__c,Amount__c,Heroku_Image_URL__c,Tour_Bill_Claim__c) VALUES %L returning id',lstConveyanceCharges);
  pool.query(conveyanceChargesInsertQuery)
  .then((conveyanceChargesQueryResult) => {
      console.log('conveyanceChargesQueryResult  '+conveyanceChargesQueryResult.rows);
      response.send('Conveyance Charges Form Saved Successfully !');    
  })
  .catch((conveyanceChargesQueryError) => {
      console.log('conveyanceChargesQueryError   '+conveyanceChargesQueryError.stack);
      response.send('Error Occured !');
  });
  
});

 router.get('/conveyanceChargesListView',verify,(request,response)=>{
    let objUser = request.user;
    console.log('objUser  : '+JSON.stringify(objUser));
    let tourbillId = request.query.tourBillClaimId;
  
    console.log('getConveyanceView tourbillId:'+tourbillId);
  
    response.render('./expenses/tourBillClaims/ConveyanceView', {objUser, tourbillId});
  })
  
  router.get('/getConveyanceDetalList',verify,(request,response)=>{
  
    let objUser = request.user;
    console.log('objUser  : '+JSON.stringify(objUser));
    let tourbillId = request.query.tourbillId;
    console.log('TourbillId Conveyamne'+tourbillId);
    pool
    .query('SELECT sfid, name, Amount__c,Date__c,Place__c ,createddate from salesforce.Conveyance_Charges__c WHERE Tour_Bill_Claim__c = $1',[tourbillId])
    .then((ConveyanceQueryResult)=>{
      console.log('ConveyanceQueryResult '+JSON.stringify(ConveyanceQueryResult.rows));
      if(ConveyanceQueryResult.rowCount>0)
      {
            let modifiedAirBuslList = [],i =1; 
            ConveyanceQueryResult.rows.forEach((eachRecord) => {
          let obj = {};
          let createdDate = new Date(eachRecord.createddate);
          createdDate.setHours(createdDate.getHours() + 5);
          createdDate.setMinutes(createdDate.getMinutes() + 30);
          let strDate = createdDate.toLocaleString();
  
          let strDate2 = new Date(eachRecord.date__c);
          let strDate3 = strDate2.toLocaleString();
          obj.sequence = i;
          obj.place=eachRecord.place__c;
          obj.name = '<a href="#" class="conveyanceViewTag" id="'+eachRecord.sfid+'" >'+eachRecord.name+'</a>';
          obj.amount = eachRecord.amount__c;
          obj.createDdate = strDate;
          obj.dated=strDate3;
          obj.editAction = '<button href="#" class="btn btn-primary editConveyance" id="'+eachRecord.sfid+'" >Edit</button>'
        
             i= i+1;
          modifiedAirBuslList.push(obj);
        })
        response.send(modifiedAirBuslList); 
      }
      else{
        response.send([]);
      }
    })
    .catch((ConveyanceQueryError)=>{
      console.log('ConveyanceQueryError '+ConveyanceQueryError.stack);
  
    })
  });
  
  router.get('/getConveyanceDetail',verify,(request,response)=>{
  
    let tourbillId = request.query.tourbillId;
    console.log('tourbillId  : '+tourbillId);
    let queryText = 'SELECT conveyancename.sfid, conveyancename.place__c, conveyancename.amount__c,conveyancename.date__c, conveyancename.name as conveyname ,tourBill.sfid  as tourId ,tourBill.name as tourbillname,conveyancename.createddate '+
                     'FROM salesforce.Conveyance_Charges__c conveyancename '+ 
                     'INNER JOIN salesforce.Tour_Bill_Claim__c tourBill '+
                     'ON conveyancename.Tour_Bill_Claim__c =  tourBill.sfid '+
                     'WHERE  conveyancename.sfid= $1 ';
  
    pool
    .query(queryText,[tourbillId])
    .then((conveyanceQueryResult) => {
          console.log('conveyanceQueryResult tourill  '+JSON.stringify(conveyanceQueryResult.rows));
          if(conveyanceQueryResult.rowCount > 0)
          {
            response.send(conveyanceQueryResult.rows);
          }
          else
          {
            response.send({});
          }
           
    })
    .catch((conveyanceQueryError) => {
          console.log('conveyanceQueryError  '+conveyanceQueryError.stack);
          response.send({});
    })
  
  
  })

  
  router.post('/updateConveyanceCharge',verify,(request,response)=>{
    let body = request.body;
    console.log('body  : '+JSON.stringify(body));
    const {conveyanceName,tourName , place, dateOfConvey,amount,hide} = request.body;
    console.log('name  '+conveyanceName);
    console.log('TourbillId  '+tourName);
    console.log('Amount  '+amount);
    console.log('place  '+place);
    console.log('dateOfConvey '+dateOfConvey);
    console.log(' Coveyance ID '+hide);
    let updateQuerry = 'UPDATE salesforce.Conveyance_Charges__c SET '+
                         'place__c = \''+place+'\', '+
                         'date__c = \''+dateOfConvey+'\', '+
                         'amount__c = \''+amount+'\' '+
                         'WHERE sfid = $1';
  console.log('updateQuerry  '+updateQuerry);
    pool
    .query(updateQuerry,[hide])
    .then((BoardingLodgingInsertResult) => {     
             console.log('BoardingLodgingInsertResult '+JSON.stringify(BoardingLodgingInsertResult));
             response.send('Success');
    })
    .catch((updatetError) => {
         console.log('updatetError   '+updatetError.stack);
         response.send('Error');
    })
  });
  

/************************************* end tourBillConveyanceCharges ******************************************************************* */


/************************************* Start boardingLodgingCharges ******************************************************************* */

router.get('/boardingLodgingCharges/:parentTourBillId', verify, (request, response) => {

    let objUser =request.user;
    let parentTourBillId = request.params.parentTourBillId;
    console.log(' boardingLodgingCharges parentTourBillId  : '+request.params.parentTourBillId);

    var boardingLodgingChargesQuery = 'SELECT sfid, Name, Tour_Bill_Claim__c, Stay_Option__c, Place_Journey__c,'+ 
                          'Correspondence_City__c, Activity_Code__c, Own_Stay_Amount__c, Project_Tasks__c , From__c, To__c,'+
                          'No_of_Days__c, Total_time__c, Actual_Amount_for_boarding_and_lodging__c, Amount_for_boarding_and_lodging__c,'+
                          'Total_Amount__c, Extra_Amount__c, Total_Allowance__c '+
                          'FROM salesforce.Boarding_Lodging__c WHERE Tour_Bill_Claim__c = $1';
    pool
    .query(boardingLodgingChargesQuery,[parentTourBillId])
    .then((boardingLodgingChargesQueryResult) => {
      //  console.log('boardingLodgingChargesQueryResult.rows '+JSON.stringify(boardingLodgingChargesQueryResult.rows));
    pool.query('SELECT city__c ,tier__c FROM Salesforce.tour_city__c')
    .then((queryResult)=>{
       // console.log('querryResuklt '+JSON.stringify(queryResult.rows));
        var city=JSON.stringify(queryResult.rows);
        console.log(city[0]);
        response.render('./expenses/tourBillClaims/boardingLodgingCharges',{objUser,city, parentTourBillId :parentTourBillId});
    }).catch((error)=>{console.log(Json.stringify(error.stack))})
    })
    .catch((boardingLodgingChargesQueryError) => {
        console.log('boardingLodgingChargesQueryError '+boardingLodgingChargesQueryError.stack);
        response.render('./expenses/tourBillClaims/boardingLodgingCharges',{objUser,city :'', parentTourBillId :parentTourBillId});
    })
});

router.post('/boardingLodgingCharges',verify, (request, response) => {
  let objUser = request.user;
  console.log('body Boarding Charges '+JSON.stringify(request.body))
  console.log('typeof(request.body.date)   : '+typeof(request.body.stayOption));
  const {stayOption,projectTask,placeJourney,fromDate ,fromTime,toDate,toTime,amtForBL,actualAMTForBL,ownStayAmount,activity_code,imgpath ,parentTourBillId} =request.body;
  console.log('ulploadFile '+imgpath);
  console.log('From stayOption '+stayOption );
  console.log('projectTask '+projectTask );
  console.log(' placeJourney '+placeJourney );
  console.log('From time '+fromTime );
  console.log('toDate  '+toDate );
  console.log('toTime time '+toTime );
  console.log('fromDate '+fromDate );
  console.log(' amtForBL '+amtForBL );
  console.log(' ownStayAmount '+ownStayAmount );
  console.log(' activity_code '+activity_code );
  console.log(' actualAMTForBL '+actualAMTForBL );
  
      let numberOfRows ;  var lstBoarding = [] , parentTourBillTemp ='';
      if(typeof(request.body.stayOption) == 'object')
      {
         numberOfRows = request.body.stayOption.length;
          console.log('numberOfRows  '+numberOfRows); 
          for(let i=0; i < numberOfRows ;i++)
        { 
          const schema =joi.object({
            stayOption:joi.string().required().label('Please Choose Stay Mode'),
          // projectTask:joi.string().required().label('Activity code is reqired '),
           toDate:joi.date().max('now').required().label('Please Select date BeFore Today Date'),
           fromDate:joi.date().required().less(joi.ref('toDate')).label('selcet date less than  ToDate '),
           actualAMTForBL:joi.number().required().label('Enter Your Actual Boarding lodging Amount'),
           imgpath:joi.string().invalid('demo').label('Upload your File/Attachments').required(),
          })
          let result=schema.validate({stayOption:stayOption[i],toDate:toDate[i],fromDate:fromDate[i],actualAMTForBL:actualAMTForBL[i],imgpath:imgpath[i]});
          console.log('Validations'+JSON.stringify(result));
          if(result.error)
          {
            console.log('fd'+result.error)
            response.send(result.error.details[0].context.label);
          }
          else
          {
          var lstcharges=[];
              lstcharges.push(stayOption[i]);
              console.log('.....1 =>'+ lstcharges);
              lstcharges.push(placeJourney[i]);
              lstcharges.push(projectTask[i]);
              console.log('.....2 =>'+ lstcharges);
           //   lstcharges.push(days[i]); 
              lstcharges.push(fromDate[i]);      
              lstcharges.push(toDate[i]);
              lstcharges.push(actualAMTForBL[i]);
              console.log('.....3 =>'+ lstcharges);
              lstcharges.push(amtForBL[i]);
              lstcharges.push(ownStayAmount[i]);
              console.log('.....4 =>'+ lstcharges);
              if(typeof(imgpath[i] != 'undefined'))
              lstcharges.push(imgpath[i]);
              else
              lstcharges.push('');
              lstcharges.push(parentTourBillId[i]);
              console.log('.....4 =>'+ lstcharges);
             // lstBoarding.push(lstcharges);
             console.log('.. '+lstcharges);

             parentTourBillTemp = parentTourBillId[i];
             lstBoarding.push(lstcharges);
          }
        }console.log(' jsdkjasdkjad'+lstBoarding);
      }
      else{
        const schema=joi.object({
          stayOption:joi.string().required().label('Please Choose Stay Mode'),
         // projectTask:joi.string().required().label('Activity code is reqired '),
          toDate:joi.date().max('now').required().label('Please Select date BeFore Today Date'),
          fromDate:joi.date().required().less(joi.ref('toDate')).label('selcet date less than  ToDate '),
          actualAMTForBL:joi.number().required().label('Enter Your Actual Boarding lodging Amount'),
          
        })
        let result=schema.validate({stayOption,toDate,fromDate,actualAMTForBL});
        console.log('Validations'+JSON.stringify(result));
        if(result.error)
        {
          console.log('fd'+result.error)
                response.send(result.error.details[0].context.label);
        }
        else{
        var lstcharges=[];
        //   lstcharges.empty();
                  lstcharges.push(stayOption);
                  lstcharges.push(placeJourney);
         // lstcharges.push(activity_code);
                  lstcharges.push(projectTask);
                //  lstcharges.push(days); 
                  lstcharges.push(fromDate);      
                  lstcharges.push(toDate);
                  lstcharges.push(actualAMTForBL);
                  lstcharges.push(amtForBL);
                  lstcharges.push(ownStayAmount);
                  lstcharges.push(imgpath);
                  lstcharges.push(parentTourBillId);
          console.log(JSON.stringify(lstcharges));
          parentTourBillTemp = parentTourBillId;
          lstBoarding.push(lstcharges);
        }
}
     console.log('lstBoarding' +lstBoarding);

      let lodgingboarding = format('INSERT INTO salesforce.Boarding_Lodging__c (Stay_Option__c, Place_Journey__c, 	project_task__c,From__c,To__c,Actual_Amount_for_boarding_and_lodging__c	,	Amount_for_boarding_and_lodging__c,Own_Stay_Amount__c,Heroku_Image_URL__c,Tour_Bill_Claim__c) VALUES %L returning id',lstBoarding);
      console.log('qyyy '+lodgingboarding);
      pool
      .query(lodgingboarding)
      .then((queryResult)=>{
        console.log('QuerryResult '+JSON.stringify(queryResult.rows));
        response.send('BoardingLodging Form Saved Successfully !');
        
      })
      .catch((error)=>{
        console.log('Error '+error.stack);
        response.send(error);
      })
  
});




router.get('/boardingLodgingListView',verify,(request,response)=>{
    let objUser = request.user;
    console.log('objUser  : '+JSON.stringify(objUser));
    let tourbillId = request.query.tourBillClaimId;
  
    console.log('Boarding/Lodging tourbillId:'+tourbillId);
  
    response.render('./expenses/tourBillClaims/boardingLodging', {objUser, tourbillId});
  
  });
  router.get('/getBoardingLodgingDetalList',verify,(request,response)=>{
  
    let objUser = request.user;
    console.log('objUser  : '+JSON.stringify(objUser));
    let tourbillId = request.query.tourbillId;
    console.log('TourbillId Boarding'+tourbillId);
    pool
    .query('SELECT sfid, name, Total_Amount__c,From__c,	To__c,Place_Journey__c ,createddate from salesforce.Boarding_Lodging__c WHERE Tour_Bill_Claim__c = $1',[tourbillId])
    .then((BoardingQueryResult)=>{
      console.log('BoardingQueryResult '+BoardingQueryResult.rows);
      if(BoardingQueryResult.rowCount>0)
      {
            let modifiedAirBuslList = [],i =1; 
            BoardingQueryResult.rows.forEach((eachRecord) => {
          let obj = {};
          let createdDate = new Date(eachRecord.createddate);
          let strDate = createdDate.toLocaleString();
  
          let strFrom = new Date(eachRecord.from__c);
          let strDateFrom = strFrom.toLocaleString();
          let strto = new Date(eachRecord.to__c);
          let strDateTo = strto.toLocaleString();
          obj.sequence = i;
          obj.place=eachRecord.place_journey__c;
          obj.name = '<a href="#" class="boardingTag" id="'+eachRecord.sfid+'" >'+eachRecord.name+'</a>';
          obj.amount = eachRecord.total_amount__c;
          obj.from=strDateFrom;
          obj.to=strDateTo;
          obj.createDdate = strDate;
          obj.editAction = '<button href="#" class="btn btn-primary editBoarding" id="'+eachRecord.sfid+'" >Edit</button>'
          i= i+1;
          modifiedAirBuslList.push(obj);
        })
        response.send(modifiedAirBuslList); 
      }
      else{
        response.send([]);
      }
    })
    .catch((BoardingQueryError)=>{
      console.log('BoardingQueryError '+BoardingQueryError.stack);
  
    })
  });
  
  
  router.get('/getBoardingDetail',verify,(request,response)=>{
    let tourbillId = request.query.tourbillId;
    console.log('tourbillId  : '+tourbillId);
    let queryText = 'SELECT boradLoad.sfid,boradLoad.No_of_Days__c,boradLoad.Stay_Option__c,boradLoad.Place_Journey__c, boradLoad.total_amount__c, boradLoad.name as boardingname ,tourBill.sfid  as tourId ,tourBill.name as tourbillname,boradLoad.createddate '+
                     'boradLoad.Correspondence_City__c, boradLoad.Activity_Code__c, boradLoad.Own_Stay_Amount__c, boradLoad.Project_Tasks__c, boradLoad.From__c, boradLoad.Too__c, boradLoad.Number_Of_Days__c, boradLoad.Heroku_Image_URL__c, boradLoad.Daily_Allowance__c '+
                     'boradLoad.Amount_of_B_L_as_per_policy__c , boradLoad.Amount_for_boarding_and_lodging__c, boradLoad.Extra_Amount__c, boradLoad.Total_Allowance__c '+
                    'FROM salesforce.Boarding_Lodging__c boradLoad '+ 
                     'INNER JOIN salesforce.Tour_Bill_Claim__c tourBill '+
                     'ON boradLoad.Tour_Bill_Claim__c =  tourBill.sfid '+
                     'WHERE  boradLoad.sfid= $1 ';
  
    pool
    .query(queryText,[tourbillId])
    .then((QueryResult) => {
          console.log('QueryResult  '+JSON.stringify(QueryResult.rows));
          if(QueryResult.rowCount > 0)
          {
            response.send(QueryResult.rows);
          }
          else
          {
            response.send({});
          }
           
    })
    .catch((QueryError) => {
          console.log('QueryError jsfkjj '+QueryError.stack);
          response.send({});
    })
  });

  router.post('/updateBoardingCharge',verify,(request,response)=>{
    let body = request.body;
    console.log('body  : '+JSON.stringify(body));
    const {boardingLoadingName,tourName , placeofJorney, stayDay,stayOption,amount,hide} = request.body;
    console.log('name  '+boardingLoadingName);
    console.log('TourbillId  '+tourName);
    console.log('Amount  '+amount);
    console.log('placeofJorney  '+placeofJorney);
    console.log('Stay Option'  +stayOption);
    console.log('stayDay  '+stayDay);
    console.log(' LodgingBoarding ID '+hide);
    let updateQuerry = 'UPDATE salesforce.Boarding_Lodging__c SET '+
                         'no_of_days__c = \''+stayDay+'\', '+
                         'place_journey__c = \''+placeofJorney+'\', '+
                         'stay_option__c = \''+stayOption+'\', '+
                         'amount__c = \''+amount+'\' '+
                         'WHERE sfid = $1';
  console.log('updateQuerry  '+updateQuerry);
    pool
    .query(updateQuerry,[hide])
    .then((BoardingLodgingInsertResult) => {     
             console.log('BoardingLodgingInsertResult '+JSON.stringify(BoardingLodgingInsertResult));
             response.send('Success');
    })
    .catch((updatetError) => {
         console.log('updatetError   '+updatetError.stack);
         response.send('Error');
    })
  });
  











/*************************************   End  boardingLodgingCharges   ******************************************************************* */









/************************************* start telephoneFoodCharges ******************************************************************* */
router.get('/telephoneFood/:parentTourBillId',verify, (request, response) => {

    let objUser=request.user;
    let parentTourBillId = request.params.parentTourBillId;
    console.log('telephoneFood  parentTourBillId  : '+request.params.parentTourBillId);

    var telephoneFoodQuery = 'SELECT sfid, Name, Laundry_Expense__c, Fooding_Expense__c, Remarks__c,'+ 
                          'Tour_Bill_Claim__c, Activity_Code__c, Project_Tasks__c, Total_Amount__c '+
                          'FROM salesforce.Telephone_Fooding_Laundry_Expenses__c WHERE Tour_Bill_Claim__c = $1';
    pool
    .query(telephoneFoodQuery,[parentTourBillId])
    .then((telephoneFoodQueryResult) => {
        console.log('telephoneFoodQueryResult.rows '+JSON.stringify(telephoneFoodQueryResult.rows));
    })
    .catch((telephoneFoodQueryError) => {
        console.log('telephoneFoodQueryError '+telephoneFoodQueryError.stack);
    })

    response.render('./expenses/tourBillClaims/telephoneFoodCharges',{objUser, parentTourBillId : parentTourBillId});
});

router.post('/telephoneFood',verify, (request, response) => {

  let body = request.body;
    console.log('request.body  :  '+JSON.stringify(body));
   /*  const schema= joi.object({
        foodingExpenses:joi.number().required().label('Choose "0" if No Fooding Expense' ),
        laundryExpenses:joi.number().required().label('choose "0" if No Laundry Expense'),
        imgpath:joi.string().invalid('demo').label('Upload your File/Attachments').required(),
        })   // .or('foodingExpenses','laundryExpenses')
    let result= schema.validate({foodingExpenses:request.body.foodingExpenses,laundryExpenses:request.body.laundryExpenses,imgpath:request.body.imgpath});
    if(result.error)
    {
        console.log('Vladtion '+JSON.stringify(result.error));
        response.send(result.error.details[0].context.label);
    } */
        let numberOfRows, lstTelephoneFood = [];
        if(typeof(request.body.foodingExpenses) != 'object')
        {
          const schema= joi.object({
            foodingExpenses:joi.number().required().label('Choose "0" if No Fooding Expense' ),
            laundryExpenses:joi.number().required().label('choose "0" if No Laundry Expense'),
            projectTask:joi.string().required().label('Selecet ActivityCode '),
            imgpath:joi.string().invalid('demo').label('Upload your File/Attachments').required(),
            })   // .or('foodingExpenses','laundryExpenses')
    
          let result= schema.validate({projectTask:request.body.projectTask, foodingExpenses:request.body.foodingExpenses,laundryExpenses:request.body.laundryExpenses,imgpath:request.body.imgpath});
                  if(result.error)
                    {
                      console.log('Vladtion '+JSON.stringify(result.error));
                      response.send(result.error.details[0].context.label);
                     } 
                     else{
                      numberOfRows = 1;
                       let singleTelephoneFoodRecord = [];
                        singleTelephoneFoodRecord.push(request.body.foodingExpenses);
                        singleTelephoneFoodRecord.push(request.body.laundryExpenses);
                        singleTelephoneFoodRecord.push(request.body.activity_code);
                        singleTelephoneFoodRecord.push(request.body.remarks);
                        singleTelephoneFoodRecord.push(request.body.imgpath);
                        singleTelephoneFoodRecord.push(request.body.parentTourBillId);
                       lstTelephoneFood.push(singleTelephoneFoodRecord);
                      }
        } 
        else
        {
            numberOfRows = request.body.foodingExpenses.length;
            for(let i=0; i< numberOfRows ; i++)
            {
              const schema= joi.object({
                foodingExpenses:joi.number().required().label('Choose "0" if No Fooding Expense' ),
                laundryExpenses:joi.number().required().label('choose "0" if No Laundry Expense'),
                projectTask:joi.string().required().label('Select Your ActivityCode first'),
                imgpath:joi.string().invalid('demo').label('Upload your File/Attachments').required(),
                })   // .or('foodingExpenses','laundryExpenses')
        
              let result= schema.validate({projectTask:request.body.projectTask[i],foodingExpenses:request.body.foodingExpenses[i],laundryExpenses:request.body.laundryExpenses[i],imgpath:request.body.imgpath[i]});
                      if(result.error)
                        {
                          console.log('Vladtion '+JSON.stringify(result.error));
                          response.send(result.error.details[0].context.label);
                         } 
                         else{
                          let singleTelephoneFoodRecord = [];
                          singleTelephoneFoodRecord.push(request.body.foodingExpenses[i]);
                          singleTelephoneFoodRecord.push(request.body.laundryExpenses[i]);
                          singleTelephoneFoodRecord.push(request.body.activity_code[i]);
                          singleTelephoneFoodRecord.push(request.body.remarks[i]);
                          singleTelephoneFoodRecord.push(request.body.imgpath[i]);
                          singleTelephoneFoodRecord.push(request.body.parentTourBillId[i]);
                          lstTelephoneFood.push(singleTelephoneFoodRecord);
                         }
             }
         }
        console.log('lstTelephoneFood  '+JSON.stringify(lstTelephoneFood));
        let telephoneFoodInsertQuery = format('INSERT INTO salesforce.Telephone_Fooding_Laundry_Expenses__c (Fooding_Expense__c, Laundry_Expense__c, Activity_Code__c,Remarks__c,heroku_image_url__c, Tour_Bill_Claim__c) VALUES %L returning id',lstTelephoneFood);
    
        pool.query(telephoneFoodInsertQuery)
        .then((telephoneFoodInsertQueryResult) => {
            console.log('telephoneFoodInsertQueryResult  '+JSON.stringify(telephoneFoodInsertQueryResult.rows));
            response.send('Telephone & Food Form Saved Successfully !');
        })
        .catch((telephoneFoodInsertQueryError) => {
            console.log('telephoneFoodInsertQueryError  '+telephoneFoodInsertQueryError.stack);
            response.send('Error Occured !');
        })  
});


router.get('/telephoneFoodCharge',verify,(request,response)=>{
    let objUser = request.user;
    console.log('objUser  : '+JSON.stringify(objUser));
    let tourbillId = request.query.tourBillClaimId;
  
    console.log('telephoneFoodCharge tourbillId:'+tourbillId);
    response.render('./expenses/tourBillClaims/telephoneFoodChargeView', {objUser,tourbillId});
  });
  
  router.get('/gettelephoneFoodChargeDetalList',verify,(request,response)=>{
    let objUser = request.user;
    console.log('objUser  : '+JSON.stringify(objUser));
    let tourbillId = request.query.tourbillId;
    console.log('Tourbill Telephone'+tourbillId);
    pool
    .query('SELECT sfid, name, Total_Amount__c,	Fooding_Expense__c,Laundry_Expense__c ,createddate from salesforce.Telephone_Fooding_Laundry_Expenses__c WHERE Tour_Bill_Claim__c = $1',[tourbillId])
    .then((telephonegQueryResult)=>{
      console.log('telephonegQueryResult '+telephonegQueryResult.rows);
      if(telephonegQueryResult.rowCount>0)
      {
            let modifiedFoodChargeList = [],i =1; 
            telephonegQueryResult.rows.forEach((eachRecord) => {
          let obj = {};
          let createdDate = new Date(eachRecord.createddate);
          createdDate.setHours(createdDate.getHours() + 5);
          createdDate.setMinutes(createdDate.getMinutes() + 30);
          let strDate = createdDate.toLocaleString();
          obj.sequence = i;
          obj.name = '<a href="#" class="telephoneChargeTag" id="'+eachRecord.sfid+'" >'+eachRecord.name+'</a>';
          obj.amount = eachRecord.total_amount__c;
          obj.fooding=eachRecord.fooding_expense__c;
          obj.laundry=eachRecord.laundry_expense__c;
          obj.createDdate = strDate;
          obj.editAction = '<button href="#" class="btn btn-primary editFooding" id="'+eachRecord.sfid+'" >Edit</button>'
             i= i+1;
             modifiedFoodChargeList.push(obj);
        })
        response.send(modifiedFoodChargeList); 
      }
      else{
        response.send([]);
      }
    })
    .catch((telephoneQueryError)=>{
      console.log('telephoneQueryError '+telephoneQueryError.stack);
  
    })
  });
  
  router.get('/gettelephoneFoodChargeDetail',verify,(request,response)=>{
    let tourbillId = request.query.tourbillId;
    console.log('tourbillId  : '+tourbillId);
    let queryText = 'SELECT charge.sfid,charge.activity_code__c, charge.project_tasks__c, charge.remarks__c, charge.total_amount__c,charge.Fooding_Expense__c,charge.Laundry_Expense__c, '+
                     'charge.name as chargegname ,tourBill.sfid  as tourId ,activity_code__c, project_tasks__c, tourBill.name as tourbillname,charge.createddate '+
                     'FROM salesforce.Telephone_Fooding_Laundry_Expenses__c charge '+ 
                     'INNER JOIN salesforce.Tour_Bill_Claim__c tourBill '+
                     'ON charge.Tour_Bill_Claim__c =  tourBill.sfid '+
                     'WHERE  charge.sfid= $1 ';
  
    pool
    .query(queryText,[tourbillId])
    .then((QueryResult) => {
          console.log('QueryResult  '+JSON.stringify(QueryResult.rows));
          if(QueryResult.rowCount > 0)
          {
            response.send(QueryResult.rows);
          }
          else
          {
            response.send({});
          }
           
    })
    .catch((QueryError) => {
          console.log('QueryError jsfkjj '+QueryError.stack);
          response.send({});
    })
  });

  router.post('/updateTeleFoodingCharge',verify,(request,response)=>{
    let body = request.body;
    console.log('body  : '+JSON.stringify(body));
    const {foodingName,tourName , laundry, foodExp,total,hide} = request.body;
    console.log('name  '+foodingName);
    console.log('TourbillId  '+tourName);
    console.log('laundry Amount  '+laundry);
    console.log('Fooding amount  '+foodExp);
    console.log('total amount  '+total);
    console.log(' TelephoneFoodCharge IDs '+hide);
    let updateQuerry = 'UPDATE salesforce.Telephone_Fooding_Laundry_Expenses__c SET '+
                         'fooding_expense__c = \''+foodExp+'\', '+
                        // 'total_amount__c = \''+total+'\', '+
                         'Laundry_Expense__c = \''+laundry+'\' '+
                         'WHERE sfid = $1';
  console.log('updateQuerry  '+updateQuerry);
    pool
    .query(updateQuerry,[hide])
    .then((TelephoneInsertResult) => {     
             console.log('TelephoneInsertResult '+JSON.stringify(TelephoneInsertResult));
             response.send('Success');
    })
    .catch((updatetError) => {
         console.log('updatetError   '+updatetError.stack);
         response.send('Error');
    })
  });
  

/************************************* End telephoneFoodCharges ******************************************************************* */











/************************************* Start Miscellaneous Charges ******************************************************************* */
router.get('/miscellenousCharges/:parentTourBillId', verify, (request, response) => {

    let objUser=request.user;
    let parentTourBillId = request.params.parentTourBillId;
    console.log('miscellenousCharges  parentTourBillId  : '+request.params.parentTourBillId);

    var miscellenousChargesQuery = 'SELECT sfid, Name, Date__c, Amount__c, Particulars_Mode__c,'+ 
                                    'Remarks__c, Activity_Code__c, Tour_Bill_Claim__c, Project_Tasks__c '+
                                    'FROM salesforce.Miscellaneous_Expenses__c WHERE Tour_Bill_Claim__c = $1';

    pool
    .query(miscellenousChargesQuery,[parentTourBillId])
    .then((miscellenousChargesQueryResult) => {
    console.log('miscellenousChargesQueryResult.rows '+JSON.stringify(miscellenousChargesQueryResult.rows));
    })
    .catch((miscellenousChargesQueryError) => {
    console.log('miscellenousChargesQueryError '+miscellenousChargesQueryError.stack);
    })

    response.render('./expenses/tourBillClaims/miscellenousCharges',{objUser, parentTourBillId : parentTourBillId});
});


router.get('/miscellaneousCharge',verify,(request,response)=>{
    let objUser = request.user;
    console.log('objUser  : '+JSON.stringify(objUser));
    let tourbillId = request.query.tourBillClaimId;
  
    console.log('Miscellaneous tourbillId:'+tourbillId);
    
    response.render('./expenses/tourBillClaims/MiscellaneousView', {objUser, tourbillId});
  
  });
  
  router.get('/getMiscellaneousDetailList',verify,(request,response)=>{
    let objUser = request.user;
    console.log('objUser  : '+JSON.stringify(objUser));
    let tourbillId = request.query.tourbillId;
    console.log('Miscellanous Telephone'+tourbillId);
    pool
    .query('SELECT sfid, name, 	Amount__c,Particulars_Mode__c,Date__c,Remarks__c ,createddate from salesforce.Miscellaneous_Expenses__c WHERE Tour_Bill_Claim__c = $1',[tourbillId])
    .then((miscellaneousQueryResult)=>{
      console.log('miscellaneousQueryResult '+JSON.stringify(miscellaneousQueryResult.rows));
      if(miscellaneousQueryResult.rowCount>0)
      {
            let modifiedList = [],i =1; 
            miscellaneousQueryResult.rows.forEach((eachRecord) => {
          let obj = {};
          let strDated = new Date(eachRecord.date__c);
          let dated = strDated.toLocaleString();
          let createdDate = new Date(eachRecord.createddate);
          createdDate.setHours(createdDate.getHours() + 5);
          createdDate.setMinutes(createdDate.getMinutes() + 30);
          let strDate = createdDate.toLocaleString();
          obj.sequence = i;
          obj.name = '<a href="#" class="miscellaneousTag" id="'+eachRecord.sfid+'" >'+eachRecord.name+'</a>';
          obj.amount = eachRecord.amount__c;
          obj.mode=eachRecord.particulars_mode__c;
          obj.remarks=eachRecord.remarks__c;
          obj.createDdate = strDate;
          obj.date=dated;
          obj.editAction = '<button href="#" class="btn btn-primary editMiscellanous" id="'+eachRecord.sfid+'" >Edit</button>'
      
              i= i+1;
             modifiedList.push(obj);
        })
        response.send(modifiedList); 
      }
      else{
        response.send([]);
      }
    })
    .catch((QueryError)=>{
      console.log('QueryError '+QueryError.stack);
  
    })
  });


  router.get('/getMiscellaneousChargeDetail',verify,(request,response)=>{
    
    let tourbillId = request.query.tourbillId;
    console.log('tourbillId  : '+tourbillId);
    let queryText = 'SELECT misChar.sfid, misChar.Amount__c,misChar.date__c,misChar.Particulars_Mode__c, misChar.name as chargegname,tourBill.sfid  as tourId ,tourBill.name as tourbillname,misChar.createddate '+
                     'FROM salesforce.Miscellaneous_Expenses__c misChar '+ 
                     'INNER JOIN salesforce.Tour_Bill_Claim__c tourBill '+
                     'ON misChar.Tour_Bill_Claim__c =  tourBill.sfid '+
                     'WHERE  misChar.sfid= $1 ';
  
    pool
    .query(queryText,[tourbillId])
    .then((QueryResult) => {
          console.log('QueryResult  '+JSON.stringify(QueryResult.rows));
          if(QueryResult.rowCount > 0)
          {
            response.send(QueryResult.rows);
          }
          else
          {
            response.send({});
          }
           
    })
    .catch((QueryError) => {
          console.log('QueryError jsfkjj '+QueryError.stack);
          response.send({});
    })
  });


  router.post('/updateMiscellanoousCharge',verify,(request,response)=>{
    let body = request.body;  
    console.log('body  : '+JSON.stringify(body));
    const {miscellanouseName,tourName , particularMode, amount,dt,hide} = request.body;
    console.log('name  '+miscellanouseName);
    console.log('TourbillId  '+tourName);
    console.log('mode  '+particularMode);
    console.log('amount  '+amount);
    console.log('date  '+dt);
    console.log(' Miscellanous IDs '+hide);
    let updateQuerry = 'UPDATE salesforce.Miscellaneous_Expenses__c SET '+
                         'particulars_mode__c = \''+particularMode+'\', '+
                         'amount__c = \''+amount+'\', '+
                         'date__c = \''+dt+'\' '+
                         'WHERE sfid = $1';
  console.log('updateQuerry  '+updateQuerry);
    pool
    .query(updateQuerry,[hide])
    .then((miscellaneousInsertResult) => {     
             console.log('miscellaneousInsertResult '+JSON.stringify(miscellaneousInsertResult));
             response.send('Success');
    })
    .catch((updatetError) => {
         console.log('updatetError   '+updatetError.stack);
         response.send('Error');
    })
  });

  

  router.post('/miscellenousCharges',verify, (request, response) => {

    console.log('miscellaneous Expenses Body '+JSON.stringify(request.body));
   /*  const schema =joi.object({
        date:joi.date().max('now').required().label('Date must be less than Today'),
     //   particulars_mode:joi.string().required(),
        amount:joi.number().required(),
    })
    let result = schema.validate({date:request.body.date,amount:request.body.amount,particulars_mode:request.body.particulars_mode})
    console.log('validation '+JSON.stringify(result));
    if(result.error)
    {
        response.send(result.error.details[0].context.label);
    } */
        let numberOfRows, lstMiscellaneousCharges = [];
        if(typeof(request.body.date) != 'object')
        {

          const schema =joi.object({
            date:joi.date().max('now').required().label('Date must be less than Today'),
            particulars_mode:joi.string().required().label('Please provide Mode'),
            projectTask:joi.string().label('Select YOur ActivityCode '),
            amount:joi.number().required().label('Amount cannot be null'),
        })
        let result = schema.validate({projectTask:request.body.projectTask,date:request.body.date,amount:request.body.amount,particulars_mode:request.body.particulars_mode})
        console.log('validation '+JSON.stringify(result));
        if(result.error)
        {
            response.send(result.error.details[0].context.label);
        } 
        else{
          console.log('Single Row');
          let singleMicellaneousChargeRecord = [];
          singleMicellaneousChargeRecord.push(request.body.date);
          singleMicellaneousChargeRecord.push(request.body.particulars_mode);
          singleMicellaneousChargeRecord.push(request.body.activity_code);
          singleMicellaneousChargeRecord.push(request.body.remarks);
          singleMicellaneousChargeRecord.push(request.body.amount);
          singleMicellaneousChargeRecord.push(request.body.imgpath);
          singleMicellaneousChargeRecord.push(request.body.parentTourBillId);
          lstMiscellaneousCharges.push(singleMicellaneousChargeRecord);
           }
        }
        else
        {
            numberOfRows = request.body.date.length;
            console.log('Multiple Rows '+'  numberOfRows '+numberOfRows);            
            for(let i=0;i < numberOfRows ; i++)
            {
               const schema =joi.object({
                date:joi.date().max('now').required().label('Date must be less than Today'),
                  particulars_mode:joi.string().required().label('Mode should BE Define'),
                  projectTask:joi.string().required().label('select ActivityCode'),
                amount:joi.number().required().label('Amount cannot be null'),
             })
            let result = schema.validate({projectTask:request.body.projectTask[i],date:request.body.date[i],amount:request.body.amount[i],particulars_mode:request.body.particulars_mode[i]})
            console.log('validation '+JSON.stringify(result));
            if(result.error)
            {
                console.log('Error in VALidation')
                response.send(result.error.details[0].context.label);
            } 
            else{
              console.log('Success vAlidation');
              let singleMicellaneousChargeRecord = [];
              singleMicellaneousChargeRecord.push(request.body.date[i]);
              singleMicellaneousChargeRecord.push(request.body.particulars_mode[i]);
              singleMicellaneousChargeRecord.push(request.body.activity_code[i]);
              singleMicellaneousChargeRecord.push(request.body.remarks[i]);
              singleMicellaneousChargeRecord.push(request.body.amount[i]);
              singleMicellaneousChargeRecord.push(request.body.imgpath[i]);
              singleMicellaneousChargeRecord.push(request.body.parentTourBillId[i]);
              lstMiscellaneousCharges.push(singleMicellaneousChargeRecord);

             }
            }  
            console.log('listMIscellaneous'+JSON.stringify(lstMiscellaneousCharges));
 
        let miscellenousChargesInsertQuery = format('INSERT INTO salesforce.Miscellaneous_Expenses__c (Date__c,Particulars_Mode__c,Activity_Code__c,Remarks__c,Amount__c, Heroku_Image_URL__c, Tour_Bill_Claim__c) VALUES %L returning id', lstMiscellaneousCharges);
        console.log('Querrrrrrrrrrrrrrrrrryyyyyyyyyyyyy'+miscellenousChargesInsertQuery);
        pool.query(miscellenousChargesInsertQuery)
        .then((miscellenousChargesInsertQueryResult) => {
            console.log('miscellenousChargesInsertQueryResult  '+JSON.stringify(miscellenousChargesInsertQueryResult.rows));
            response.send('Miscellenous Charges Form Saved Succesfully');
        })
        .catch((miscellenousChargesInsertQueryError) => {
            console.log('miscellenousChargesInsertQueryError  '+miscellenousChargesInsertQueryError.stack);
            response.send('Error Occurred !');
        })
        
    }

    
});
 


/************************************* End Miscellaneous Charges ******************************************************************* */







/*************************************************************************************************************************************************** */

router.get('/gettourBillClaimDetail',verify,(request, response) => {

    let  tourbillId= request.query.tourbillId;
    console.log('tourbillId  : '+tourbillId);
    let queryText = 'SELECT tourBill.sfid, tourBill.grand__c, tourBill.name as tourbillname ,exp.name as expname,tourBill.createddate '+
                     'FROM salesforce.Tour_Bill_Claim__c tourBill '+ 
                     'INNER JOIN salesforce.Milestone1_Expense__c exp '+
                     'ON tourBill.Expense__c =  exp.sfid '+
                     'WHERE  tourBill.sfid= $1 ';
  
    pool
    .query(queryText,[tourbillId])
    .then((tourBillClaimResult) => {
          console.log('tourBillClaimResult  '+JSON.stringify(tourBillClaimResult.rows));
          if(tourBillClaimResult.rowCount > 0)
          {
            response.send(tourBillClaimResult.rows);
          }
          else
          {
            response.send({});
          }
           
    })
    .catch((tourBillClaimQueryError) => {
          console.log('tourBillClaimQueryError  '+tourBillClaimQueryError.stack);
          response.send({});
    })
  
  })




  router.get('/fetchActivityCodes', verify,async (request, response) => {

    let objUser = request.user;
    let tourbillId = request.query.tourbillId;
    let projectId= '';
    console.log('tourbillId  : '+tourbillId);

    await
    pool
    .query('SELECT exp.sfid,exp.Project_Name__c FROM salesforce.Milestone1_Expense__c as exp INNER JOIN salesforce.Tour_Bill_Claim__c as tbc ON exp.sfid = tbc.Expense__c  WHERE tbc.sfid = $1',[tourbillId])
    .then((expenseQueryResult) => {
        console.log('expenseQueryResult  : '+JSON.stringify(expenseQueryResult.rows));
        if(expenseQueryResult.rowCount > 0)
        {
          projectId = expenseQueryResult.rows[0].project_name__c;
        }
    })
    .catch((expenseQueryError) => {
        console.log('expenseQueryError  : '+expenseQueryError.stack);
    })
  

    
    await
    pool
    .query('SELECT sfid ,name FROM salesforce.Milestone1_Milestone__c WHERE Project__c = $1 AND name != \'Timesheets\'',[projectId])
    .then((milestoneQueryResult) => {
        console.log('milestoneQueryResult LLL : '+JSON.stringify(milestoneQueryResult.rows));
        //response.send(milestoneQueryResult.rows);
        if(milestoneQueryResult.rowCount > 0)
        {
            let taskQueryparams = [], milestoneIds = [];
            for(let i = 0 , length = milestoneQueryResult.rows.length ; i < length ; i++)
            {
              taskQueryparams.push('$'+(i+1));
              milestoneIds.push(milestoneQueryResult.rows[i].sfid);
            }  
            
            let taskQuery = 'Select sfid ,Activity_Code__c FROM salesforce.Milestone1_Task__c where sfid IS NOT NULL AND Project_Milestone__c IN ('+taskQueryparams.join(',')+')';
            console.log('taskQuery  : '+taskQuery);
            pool
            .query(taskQuery,milestoneIds)
            .then((taskQueryResult) => {
                  if(taskQueryResult.rowCount > 0)
                  {
                    response.send(taskQueryResult.rows);
                  }
            })
            .catch((taskQueryError) => {
                  console.log('taskQueryError  : '+taskQueryError.stack);
                  response.send([]);
            })
        }
        
    })
    .catch((milestoneQueryError) => {
        console.log('milestoneQueryError HHH : '+milestoneQueryError.stack);
        response.send([]);
    })
  
  });

router.get('/fetchAllowence',verify,(request,response)=>{
  let name= request.query.name;
  let designation=request.user.pm_email__c;
  console.log('designation  '+designation);
  let cityId='';
  console.log('cityName '+ JSON.stringify(name));
  pool.query('SELECT sfid ,City__c,	Tier__c FROM salesforce.Tour_City__c WHERE city__c=$1',[name])
  .then((result)=>{
   console.log('result City '+JSON.stringify(result.rows));
    let city=result.rows;
    cityId=city[0].sfid;
    console.log('cityID'+cityId);
    let qry ='SELECT sfid ,Daily_Allowance_amount__c,Boarding_Lodging__c,Designation__c,Own_Stay__c FROM salesforce.Tour_Expense__c where Tour_City__c=$1 AND Designation__c=$2';
    console.log(qry);
    pool
    .query(qry,[cityId,designation])
    .then((results)=>{
      console.log('Count '+results.rowCount);
      console.log('results '+ JSON.stringify(results.rows));
      let allownce = results.rows;

      response.send(results.rows)
    })
    .catch((erros)=>{
      console.log('error'+erros.stack);
      response.send(erros);
    })
  })
  .catch((error)=>{
    console.log("eroor"+error.stack);
    response.send(error);
  })
})



module.exports = router;