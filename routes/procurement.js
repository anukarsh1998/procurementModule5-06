const pool = require('../db/dbConfig');
const verify = require('../config/verifyToken');
const format = require('pg-format');
const joi = require('@hapi/joi');
const Router = require('express-promise-router');
const { response, request } = require('express');
const { body } = require('express-validator');
const { json } = require('body-parser');
const router = new Router();

router.get('/',verify,(request, response)=> {
    
    console.log('Procurement request.user '+JSON.stringify(request.user));
    var userId = request.user.sfid; 
    var objUser = request.user;
    console.log('Procurement userId : '+userId);

    pool
    .query('SELECT sfid, Name,Project_Department__c, Approval_Status__c, Number_Of_IT_Product__c, Number_Of_Non_IT_Product__c, Procurement_IT_total_amount__c, Procurement_Non_IT_total_amount__c, Total_amount__c FROM  salesforce.Asset_Requisition_Form__c WHERE Submitted_By_Heroku_User__c = $1',[userId])
    .then((assetQueryResult) => {
            console.log('assetQueryResult   '+assetQueryResult.rows);
            if(assetQueryResult.rowCount > 0)
                response.render('assetRequistionForms',{objUser : objUser, name:request.user.name, email : request.user.email, assetList : assetQueryResult.rows });
            else
                response.render('assetRequistionForms',{objUser : objUser, name:request.user.name, email : request.user.email, assetList : []});
    })
    .catch((assetQueryError) => {
        console.log('assetQueryError   '+assetQueryError.stack);
        response.render('assetRequistionForms',{objUser : objUser,name:request.user.name, email : request.user.email, assetList : []});
    })
});

router.get('/details',verify, async(request, response) => {

    var assetId = request.query.assetId;
    console.log('assetId   '+assetId);

    var assetFormAndRelatedRecords = {};
    
 let qyr='SELECT asset.id, asset.sfid,asset.name as name ,asset.Activity_Code__c, asset.GST__c,asset.Requested_Closure_Plan_Date__c,asset.Requested_Closure_Actual_Date__c,asset.Project_Department__c, '+
 'asset.Manager_Approval__c,asset.Management_Approval__c,asset.Procurement_Committee_Approval__c,asset.Chairperson_Approval__c,asset.Committee_Approved_Counts__c,'+
 'asset.Comittee_Rejected_Count__c,asset.Procurement_Committee_Status__c,asset.Accounts_Approval__c,asset.Procurement_Head_Approval__c,asset.Approval_Status__c,'+
 'asset.Number_Of_IT_Product__c,asset.Number_Of_Non_IT_Product__c,asset.Procurement_IT_total_amount__c,asset.Procurement_Non_IT_total_amount__c, asset.Total_amount__c,proj.name as projname,proj.sfid '+
 'FROM  salesforce.Asset_Requisition_Form__c asset '+
  'INNER JOIN salesforce.Milestone1_Project__c proj '+
  'ON asset.Project_Department__c =  proj.sfid '+
   'WHERE asset.sfid = $1';
   console.log('qry '+qyr);
    await
    pool
    .query(qyr,[assetId])
    .then((assetQueryResult)=> {
        if(assetQueryResult.rowCount > 0)
        {
            console.log('assetQueryResult  '+assetQueryResult.rows);
            assetFormAndRelatedRecords.assetFormDetails = assetQueryResult.rows;        
        }
        else
        {
            assetFormAndRelatedRecords.assetFormDetails = [];
        }
    })
    .catch((assetQueryError)=> {
        console.log('assetQueryError  : '+assetQueryError.stack);
        assetFormAndRelatedRecords.assetFormDetails = [];
    })

    await
    pool
    .query('SELECT sfid, Name,Products_Services_Name__c, Items__c,Quantity__c, Others__c, Budget__c FROM  salesforce.Product_Line_Item__c WHERE Asset_Requisition_Form__c = $1',[assetId])
    .then((NonItProductResult)=> {
            if(NonItProductResult.rowCount > 0)
            {   
                    console.log('NonItProductResult  '+NonItProductResult.rows);
                    assetFormAndRelatedRecords.nonItProducts = NonItProductResult.rows;
            }
            else
            {
                assetFormAndRelatedRecords.nonItProducts = [];
            }

    })
    .catch((NonItProductError)=> {
        console.log('NonItProductError  '+NonItProductError.stack);
        assetFormAndRelatedRecords.nonItProducts = [];
    })

    await
    pool
    .query('SELECT sfid, Name, Items__c, Quantity__c, Budget__c FROM salesforce.Product_Line_Item_IT__c WHERE Asset_Requisition_Form__c = $1 ',[assetId])
    .then((ItProductResult) => {
            if(ItProductResult.rowCount > 0)
            {
                console.log('ItProductResult  '+ItProductResult.rows);
                assetFormAndRelatedRecords.itProducts = ItProductResult.rows;
            }
            else
            {
                assetFormAndRelatedRecords.itProducts = [];
            }
     })
    .catch((ItProductError) => {
        console.log('ItProductError   '+ItProductError.stack);
        assetFormAndRelatedRecords.itProducts = [];
    })


    response.send(assetFormAndRelatedRecords);

});

router.post('/insertAsssetForm',(request,response)=>{
    let body = request.body;
    console.log('Form Value =>'+JSON.stringify(body));
   const{assetRequisitionName,projectName,actualDate,planDate,gst,submittedBy,spocApproval,availableInStock}=request.body;
   console.log('Asset name=> '+assetRequisitionName);
   console.log('Asset projectName=> '+projectName);
   console.log('Asset actualDate=> '+actualDate);
   console.log('Asset planDate=> '+planDate);
   console.log('Asset gst=> '+gst);
   console.log('Asset spocApproval=> '+submittedBy);
   console.log('Asset spocApproval=> '+spocApproval);
   console.log('availableInStock=> '+availableInStock);
   let query ='INSERT INTO salesforce.Asset_Requisition_Form__c (name,Project_Department__c,Requested_Closure_Actual_Date__c,Requested_Closure_Plan_Date__c,GST__c,Submitted_By_Heroku_User__c,Is_SPOC_Approved__c,Available_In_Stock__c) values ($1,$2,$3,$4,$5,$6,$7,$8)';
   console.log('asset Insert Query= '+query);
   pool
   .query(query,[assetRequisitionName,projectName,actualDate,planDate,gst,submittedBy,spocApproval,availableInStock])
   .then((assetQueryResult) => {     
            console.log('assetQueryResult.rows '+JSON.stringify(assetQueryResult.rows));
            response.send('Success');
   })
   .catch((assetInserError) => {
        console.log('assetInserError   '+assetInserError.stack);
        response.send('Error');
   })
})

router.get('/nonItProducts/:parentAssetId',verify, (request,response) => {

    let parentAssetId = request.params.parentAssetId;
    console.log('parentAssetId  '+parentAssetId);

    response.render('procurementNonIT',{name: request.user.name, email: request.user.email, parentAssetId : parentAssetId});
});


router.post('/nonItProducts', (request,response) => {

   let nonItFormResult = request.body;

   console.log('nonItFormResult  '+JSON.stringify(nonItFormResult));
  /*  let img1=request.body.imgpath1;
   console.log('=>>'+img1);
   let img2=request.body.imgpath2;
   console.log('=>>'+img2);
   let img3=request.body.imgpath3;
   console.log('=>>'+img3);
   let justify=request.body.justification;
   console.log('justified'+justify); */

   const{state,district,itemsCategory,items,itemSpecification,quantity,budget}=request.body;
   let numberOfRows,lstNonItProcurement = [];
   if(typeof(nonItFormResult.quantity) != 'object')
   {

        let schema=joi.object({
            state:joi.string().required().label('Please Choose State'),
             itemsCategory:joi.string().required().label('Choose itemsCategory & District If Your Choose UP Or UK'),
             items:joi.string().required().label('Choose your Item'),
            itemSpecification:joi.string().required().label('Fill your Item Specification'),          
            quantity:joi.number().required().label('Enter your Quantity'),
            budget:joi.number().required().label('fill Your Budget '),
        })
        let result=schema.validate({state,items,itemsCategory,itemSpecification,quantity,budget});
        console.log('validation hsh '+JSON.stringify(result.error));
        if(result.error){
            console.log('fd'+result.error);
            response.send(result.error.details[0].context.label);
        }
        else{
            if(nonItFormResult.quoteNum<3 && (nonItFormResult.justification==null || nonItFormResult.justification=="")){
                    response.send('Please Enter Your Justification for Quote less than 3');    
           }
           else{
            let singleRecordValues = [];
            singleRecordValues.push(nonItFormResult.itemsCategory);
            singleRecordValues.push(nonItFormResult.items);
          //  singleRecordValues.push(nonItFormResult.otherItems);
            singleRecordValues.push(nonItFormResult.itemSpecification);
            singleRecordValues.push(nonItFormResult.quantity);
            singleRecordValues.push(nonItFormResult.budget);
            singleRecordValues.push(nonItFormResult.imgpath1);
            singleRecordValues.push(nonItFormResult.imgpath2);
            singleRecordValues.push(nonItFormResult.imgpath3);
            singleRecordValues.push(nonItFormResult.quoteNum    );
            singleRecordValues.push(nonItFormResult.justification);
            singleRecordValues.push(nonItFormResult.vendor);
            singleRecordValues.push(nonItFormResult.parentProcurementId);
            lstNonItProcurement.push(singleRecordValues);
            console.log('lstNOnIt'+lstNonItProcurement);
           }
      

        }      
   }
   else
   {
        numberOfRows = nonItFormResult.quantity.length;
        console.log('ROW COUnct'+numberOfRows);
        for(let i=0; i< numberOfRows ; i++)
        { 
            let schema=joi.object({
                state:joi.string().required().label('Please Choose State'),
                itemsCategory:joi.string().required().label('Choose itemsCategory & District If Your Choose UP Or UK'),
                items:joi.string().required().label('Choose your Item'),
                itemSpecification:joi.string().required().label('Fill your ITem Specification'),          
                quantity:joi.number().required().label('Enter your Quantity'),
                budget:joi.number().required().label('fill Your Budget '),
    
            })
            let result=schema.validate({state:state[i],items:items[i],itemsCategory:itemsCategory[i],itemSpecification:itemSpecification[i],quantity:quantity[i],budget:budget[i]});
            console.log('validation REsult mul'+JSON.stringify(result.error));
            if(result.error){
                console.log('Validation error'+result.error);
                response.send(result.error.details[0].context.label);
            }
            else{
                if(nonItFormResult.quoteNum[i]<3 &&(nonItFormResult.justification[i]==null || nonItFormResult.justification[i]=="")){               
                        response.send('Please Enter your Justification for Quote less than 3');    
                }
                else{

                    let singleRecordValues = [];
                    singleRecordValues.push(nonItFormResult.itemsCategory[i]);
                    singleRecordValues.push(nonItFormResult.items[i]);
                   // singleRecordValues.push(nonItFormResult.otherItems[i]);       
                    singleRecordValues.push(nonItFormResult.itemSpecification[i]);
                    singleRecordValues.push(nonItFormResult.quantity[i]);
                    singleRecordValues.push(nonItFormResult.budget[i]);
                    singleRecordValues.push(nonItFormResult.imgpath1[i]);
                    singleRecordValues.push(nonItFormResult.imgpath2[i]);
                    singleRecordValues.push(nonItFormResult.imgpath3[i]);
                    singleRecordValues.push(nonItFormResult.quoteNum[i]);
                    singleRecordValues.push(nonItFormResult.justification[i]);
                    singleRecordValues.push(nonItFormResult.vendor[i]);
                    singleRecordValues.push(nonItFormResult.parentProcurementId[i]);
                    lstNonItProcurement.push(singleRecordValues);
                    console.log('dj'+singleRecordValues);
                }
            }

       }
   }
   if(typeof(nonItFormResult.quantity) != 'object')
   {
    let nonItProductsInsertQuery = format('INSERT INTO salesforce.Product_Line_Item__c (Products_Services_Name__c, Items__c, Product_Service__c, Quantity__c, Budget__c, Quote1__c,Quote2__c	,Quote3__c,Number_of_quotes__c,justification__c,Impaneled_Vendor__c, Asset_Requisition_Form__c ) VALUES %L returning id',lstNonItProcurement);
    console.log('nonItProductsInsertQuery '+nonItProductsInsertQuery);
    pool.query(nonItProductsInsertQuery)
    .then((nonItProductsInsertQueryResult) => {
         console.log('nonItProductsInsertQueryResult  '+JSON.stringify(nonItProductsInsertQueryResult.rows));
         response.send('Saved Successfully');
    })
    .catch((nonItProductsInsertQueryError) => {
         console.log('nonItProductsInsertQueryError  '+nonItProductsInsertQueryError.stack);
         response.send('Error Occured !');
    })
   }
   else{
    console.log('lstNonItProcurement:'+lstNonItProcurement.length+' number of rows :'+nonItFormResult.quantity.length);
   if(lstNonItProcurement.length==nonItFormResult.quantity.length){
    let nonItProductsInsertQuery = format('INSERT INTO salesforce.Product_Line_Item__c (Products_Services_Name__c, Items__c, Product_Service__c, Quantity__c, Budget__c, Quote1__c,Quote2__c	,Quote3__c,Number_of_quotes__c,justification__c,Impaneled_Vendor__c, Asset_Requisition_Form__c ) VALUES %L returning id',lstNonItProcurement);
    console.log('nonItProductsInsertQuery '+nonItProductsInsertQuery);
    pool.query(nonItProductsInsertQuery)
    .then((nonItProductsInsertQueryResult) => {
         console.log('nonItProductsInsertQueryResult  '+JSON.stringify(nonItProductsInsertQueryResult.rows));
         response.send('Saved Successfully');
    })
    .catch((nonItProductsInsertQueryError) => {
         console.log('nonItProductsInsertQueryError  '+nonItProductsInsertQueryError.stack);
         response.send('Error Occured !');
    })
   }
}
});





router.get('/itProducts/:parentAssetId',verify, (request,response) => {

    let parentAssetId = request.params.parentAssetId;
    console.log('parentAssetId  '+parentAssetId);
  /*   let qry ='SELECT sfid ,	State__c,District__c,Items__c Form salesforce.Impaneled_Vendor__c';
    pool
    .query()
    .then((queryResult)=>{
        console.log('queryResult=>'+JSON.stringify(queryResult.rows));
        let state =[];
        queryResult.forEach((each)=>{
            state.push(each.state);
        })
        response.render('procurementIT',{name: request.user.name, email: request.user.email, parentAssetId: parentAssetId});
    }) */
    response.render('procurementIT',{name: request.user.name, email: request.user.email, parentAssetId: parentAssetId});

});


router.post('/itProducts', (request,response) => {

    console.log('Inside ItProducts Post Method');
    let itFormResult = request.body;
    const{state,items,itemSpecification,quantity,budget}=request.body;
    
    console.log('itFormResult  '+JSON.stringify(itFormResult));

    let numberOfRows, lstItProducts= [];
    if(typeof(itFormResult.quantity) != 'object')
    {
        const schema = joi.object({
            state:joi.string().required().label('Please chose State First'),
         //   district:joi.string().label('chose district') 
         items:joi.string().required().label('Choose your ITEM and District if State is UP or UK '),
         itemSpecification:joi.string().required().label('please Enter Item Specification'),
         quantity:joi.number().required().label('Enter Your Quanity '),
         budget:joi.number().required().label('Enter Your Budget'),
        })
        let result=schema.validate({state,items,itemSpecification,quantity,budget});
        console.log('validation REsult '+JSON.stringify(result.error));
        if(result.error){
            console.log('fd'+result.error);
            response.send(result.error.details[0].context.label);
        }
        else{
            if(itFormResult.quoteNum<3 &&(itFormResult.justification==null || itFormResult.justification=="")){
                    response.send('Please Enter Your Justification for Quote less than 3');     
             }
             else{
                let singleItProductRecordValue = [];
                singleItProductRecordValue.push(itFormResult.items);
                singleItProductRecordValue.push(itFormResult.vendor);
                singleItProductRecordValue.push(itFormResult.itemSpecification);
                singleItProductRecordValue.push(itFormResult.quantity);
                singleItProductRecordValue.push(itFormResult.budget);
                singleItProductRecordValue.push(itFormResult.imgpath1);
                singleItProductRecordValue.push(itFormResult.imgpath2);
                singleItProductRecordValue.push(itFormResult.imgpath3);
                singleItProductRecordValue.push(itFormResult.quoteNum);
                singleItProductRecordValue.push(itFormResult.justification);
                singleItProductRecordValue.push(itFormResult.parentProcurementId);
                lstItProducts.push(singleItProductRecordValue);
                console.log('else '+lstItProducts);
             }          
           
        }
    }
    else
    {
        numberOfRows = itFormResult.quantity.length;
        console.log('rowCount= '+numberOfRows);
        for(let i=0; i< numberOfRows ; i++)
        {
            const schema = joi.object({
                state:joi.string().required().label('Please chose State First'),
             //   district:joi.string().label('chose district') 
             items:joi.string().required().label('Choose your ITEM and District if State is UP or UK '),
             itemSpecification:joi.string().required().label('please Enter Item Specification'),
             quantity:joi.number().required().label('Enter Your Quanity '),
             budget:joi.number().required().label('Enter Your Budget'),
            })
            let result=schema.validate({state:state[i],items:items[i],itemSpecification:itemSpecification[i],quantity:quantity[i],budget:budget[i]});
            console.log('validation REsult '+JSON.stringify(result.error));
            if(result.error){
                console.log('fd'+result.error);
                response.send(result.error.details[0].context.label);
            }
            else{                
                if(itFormResult.quoteNum[i]<3 &&(itFormResult.justification[i]==null || itFormResult.justification[i]=="")){
                    response.send('Please Enter Your Justificaton for Quote less than 3 in row number');     
             }
             else{
                let singleItProductRecordValue = [];
                singleItProductRecordValue.push(itFormResult.items[i]);
                singleItProductRecordValue.push(itFormResult.vendor[i]);
                singleItProductRecordValue.push(itFormResult.itemSpecification[i]);
                singleItProductRecordValue.push(itFormResult.quantity[i]);
                singleItProductRecordValue.push(itFormResult.budget[i]);
                singleItProductRecordValue.push(itFormResult.imgpath1[i]);
                singleItProductRecordValue.push(itFormResult.imgpath2[i]);
                singleItProductRecordValue.push(itFormResult.imgpath3[i]);
                singleItProductRecordValue.push(itFormResult.quoteNum[i]);
                singleItProductRecordValue.push(itFormResult.justification[i]);
                singleItProductRecordValue.push(itFormResult.parentProcurementId[i]);
                lstItProducts.push(singleItProductRecordValue);
             }
            }
        }
        console.log('lstProduct '+lstItProducts);
    }

    console.log('lstItProducts  '+JSON.stringify(lstItProducts));
    if(typeof(itFormResult.quantity)!='object'){
        console.log('single row');
        const itProductsInsertQuery = format('INSERT INTO salesforce.Product_Line_Item_IT__c (Items__c,Impaneled_Vendor__c,Product_Service_specification__c, Quantity__c, Budget__c,Quote1__c,Quote2__c,Quote3__c,Number_of_quotes__c,justification__c ,Asset_Requisition_Form__c ) values %L returning id',lstItProducts);
        console.log(itProductsInsertQuery);
        pool.query(itProductsInsertQuery)
        .then((itProductsInsertQueryResult) => {
            console.log('itProductsInsertQueryResult  : '+JSON.stringify(itProductsInsertQueryResult.rows));
            response.send('Saved Successfully !');
        })
        .catch((itProductsInsertQueryError) => {
            console.log('itProductsInsertQueryError  : '+itProductsInsertQueryError.stack);
            response.send('Error Occurred !');
        })

    }
   if(lstItProducts.length==numberOfRows)
   {
    const itProductsInsertQuery = format('INSERT INTO salesforce.Product_Line_Item_IT__c (Items__c,Impaneled_Vendor__c,Product_Service_specification__c, Quantity__c, Budget__c,Quote1__c,Quote2__c,Quote3__c,Number_of_quotes__c,justification__c ,Asset_Requisition_Form__c ) values %L returning id',lstItProducts);
    console.log(itProductsInsertQuery);
    pool.query(itProductsInsertQuery)
    .then((itProductsInsertQueryResult) => {
        console.log('itProductsInsertQueryResult  : '+JSON.stringify(itProductsInsertQueryResult.rows));
        response.send('Saved Successfully !');
    })
    .catch((itProductsInsertQueryError) => {
        console.log('itProductsInsertQueryError  : '+itProductsInsertQueryError.stack);
        response.send('Error Occurred !');
    })
   }
    
});


router.get('/getRelatedQuote',(request, response) => {

    let filterValues = request.query.filtervalues;
    console.log('filtervalues  '+JSON.stringify(filterValues));
    console.log('filterValues.itemsCategoryValue '+filterValues.itemsCategoryValue);

    pool.query('SELECT sfid, Quote_Public_URL__c FROM salesforce.Impaneled_Vendor__c WHERE services__c = $1 AND items__c = $2 AND location_vendor__c = $3 ',[filterValues.itemsCategoryValue ,filterValues.itemValue,filterValues.placeValue])
    .then((QuoteQueryResult) => {
        console.log('QuoteQueryResult  '+JSON.stringify(QuoteQueryResult.rows));
        if(QuoteQueryResult.rowCount > 0)
        {
            response.send(QuoteQueryResult.rows[0]);
        }
        else
        {
            console.log('Else Block');
            response.send('Not Found');
        }
            
    })
    .catch((QuoteQueryError) => {
        console.log('QuoteQueryError  '+QuoteQueryError.stack);
        response.send('Not Found');
    })

});
router.get('/getCostandGSt',async(request,response)=>{
    let data=request.query.data;
    console.log('Data requiremet'+JSON.stringify(data));
    let st =data[0].state;
    let dstr=data[0].district;
    let ite=data[0].item;
    console.log('district'+dstr);
    console.log('item'+ite);
    console.log('state'+st);
    let qry='';
    let lst=[];
    let vender=[];
    let itemDesId=[];
    let qryItem='select sfid ,name,Impaneled_Vendor__c from salesforce.Item_Description__c WHERE Items__c =$1';  
     console.log('qryItem '+qryItem);
     await
     pool.query(qryItem,[ite])
     .then((result)=>{
         console.log('result '+JSON.stringify(result.rows));
         result.rows.forEach((each)=>{
            itemDesId.push(each);
         })
     })
     .catch((error)=>{
         console.log('Error  '+JSON.stringify(error.stack));
         response.send(error);
     })
     if(dstr=='' || dstr==null)
     {
         qry='SELECT sfid,vendor_name__c,GST_No__c,	Quote_Public_URL__c FROM salesforce.Impaneled_Vendor__c WHERE state__c = $1 ';
         lst.push(st);
         lst.push(ite);
         console.log('qryyy '+qry+'lstItem '+lst);
     }
     else{
         qry='SELECT sfid,vendor_name__c,GST_No__c,Quote_Public_URL__c FROM salesforce.Impaneled_Vendor__c WHERE state__c = $1 AND District__c = $2  ';
         lst=[st,dstr];
         console.log('qry '+qry+'lst '+lst);
     }
     console.log("items "+JSON.stringify(itemDesId));
     await
     pool
     .query(qry,lst)
     .then((querryResult)=>{
         console.log('querryResult '+JSON.stringify(querryResult.rows));
         if(querryResult.rowCount>0)
         {
            querryResult.rows.forEach((each)=>{
                   itemDesId.forEach((eachItem)=>{
                       if(each.sfid==eachItem.impaneled_vendor__c){
                        vender.push(each);
                       }
            })
           })  
           console.log
           response.send(vender);                   
         }       
     })
     .catch((querryError)=>{
         console.log('querryError '+querryError.stack);
         response.send(querryError);
     })
     
    
})

router.get('/getCostPerUnit',(request,response)=>{
    let sid=request.query.sid;
    console.log('seleceted ID =>'+sid);
    pool
    .query('SELECT sfid,Per_Unit_Cost__c,unit__c,items__c FROM salesforce.Item_Description__c where Impaneled_Vendor__c =$1',[sid])
    .then((querryResult)=>{
        console.log('queryResult  =>'+JSON.stringify(querryResult)+' '+ querryResult.rowCount);
        response.send(querryResult.rows);
    })
    .catch((querryError)=>{
        console.log(querryError.stack);
        response.send(querryError);
    })
})

router.get('/getProjectList',(request,response) => {

    console.log('Hello PRoject List');

    pool.query('SELECT sfid, name FROM salesforce.Milestone1_Project__c')
    .then((projectQueryResult)=> {
            console.log('projectQueryResult  '+JSON.stringify(projectQueryResult.rows));
            response.send(projectQueryResult.rows);
    })
    .catch((projectQueryError) => {
            console.log('projectQueryResult   '+projectQueryResult.stack);
            response.send([]);
    })

})

router.get('/getProcurementItListView',verify,(request,response)=>{
    let objUser=request.user;
    console.log('user '+objUser);
    response.render('procurementListView',{objUser});
})

router.get('/itProcurementList',(request,response)=>{
    console.log('Your are inside the IT PRCUREMENT List Router method');
    let qry='SELECT procIT.sfid,procIT.Name as procItName ,procIT.Items__c ,procIT.Product_Service_specification__c,vend.name as venderName,procIT.Quantity__c, procIT.Budget__c,procIT.Impaneled_Vendor__c '+
            'FROM salesforce.Product_Line_Item_IT__c procIT '+
            'INNER JOIN salesforce.Impaneled_Vendor__c vend '+
            'ON procIT.Impaneled_Vendor__c =  vend.sfid ';
            console.log('qyer '+qry)
     pool
    .query(qry)
    .then((querryResult)=>{
        console.log('querryResult'+JSON.stringify(querryResult.rows)+'ROWCOUNT: '+querryResult.rowCount);
        if(querryResult.rowCount>0){

            let modifiedProcurementITList = [],i =1;
            querryResult.rows.forEach((eachRecord) => {
              let obj = {};
              obj.sequence = i;
              obj.name = '<a href="#" class="procureItTag" id="'+eachRecord.sfid+'" >'+eachRecord.procitname+'</a>';
              obj.item = eachRecord.items__c;
              obj.item_spec = eachRecord.product_service_specification__c;
              obj.quantity = eachRecord.quantity__c;
              obj.budget = eachRecord.budget__c;
              obj.vendor=eachRecord.vendername;
              obj.editAction = '<button href="#" class="btn btn-primary editProcIt" id="'+eachRecord.sfid+'" >Edit</button>'
              i= i+1;
              modifiedProcurementITList.push(obj);
            })
            response.send(modifiedProcurementITList);
        }
        else
        {
            response.send([]);
        }
    })
    .catch((querryError)=>{
        console.log('QuerrError=>'+querryError.stack);
        response.send(querryError); 
    })

})
router.get('/getProcurementITDetail',(request,response)=>{
      let procurementId=request.query.procurementId;
        console.log('getProcurementITDetail Id='+procurementId);
        let qry='SELECT procIT.sfid,procIT.Name as procItName ,procIT.Items__c ,procIT.Product_Service_specification__c,vend.name as venderName,procIT.Quantity__c, procIT.Budget__c,procIT.Impaneled_Vendor__c '+
        'FROM salesforce.Product_Line_Item_IT__c procIT '+
        'INNER JOIN salesforce.Impaneled_Vendor__c vend '+
        'ON procIT.Impaneled_Vendor__c =  vend.sfid '+        
        'WHERE procIt.SFID=$1';
    console.log('Query '+qry);
    pool
    .query(qry,[procurementId])
    .then((querryResult)=>{
        console.log('QuerryResult=>'+JSON.stringify(querryResult.rows));
        response.send(querryResult.rows);
    })
    .catch((querryError)=>{
        console.log('QuerrError '+querryError.stack);
        response.send(querryError);

    })
})
/**********************************  NON IT PROCUREMENT LIST VIEW   ******************************/
router.get('/getNonItProcurementListVIew',verify,(request,response)=>{
    let objUser=request.user;
    console.log('user '+objUser);
    response.render('getNonItProcurementList',{objUser});
})

router.get('/NonItProcurementList',(request,response)=>{
    console.log('nonIT DETAIL LIST ');
    let qry='SELECT proc.sfid,proc.Name as procName ,proc.Items__c ,proc.Products_Services_Name__c,vend.name as vendorName,proc.Product_Service__c,proc.Quantity__c, proc.Budget__c,proc.Impaneled_Vendor__c '+
    'FROM salesforce.Product_Line_Item__c proc '+
    'INNER JOIN salesforce.Impaneled_Vendor__c vend '+
    'ON proc.Impaneled_Vendor__c =  vend.sfid ';
    console.log('Queryy=> '+qry);
    pool
    .query(qry)
    .then((querryResult)=>{
        console.log('querryResultnonIt'+JSON.stringify(querryResult.rows)+'ROWCOUNT: '+querryResult.rowCount);
        if(querryResult.rowCount>0){

            let modifiedProcurementList = [],i =1;
            querryResult.rows.forEach((eachRecord) => {
              let obj = {};
              obj.sequence = i;
              obj.name = '<a href="#" class="procurementTag" id="'+eachRecord.sfid+'" >'+eachRecord.procname+'</a>';
              obj.item = eachRecord.items__c;
              obj.item_spec=eachRecord.product_service__c;
              obj.item_category = eachRecord.products_services_name__c;
              obj.quantity = eachRecord.quantity__c;
              obj.budget = eachRecord.budget__c;
              obj.vendor=eachRecord.vendorname;
              obj.editAction = '<button href="#" class="btn btn-primary editProcurement" id="'+eachRecord.sfid+'" >Edit</button>'
              i= i+1;
              modifiedProcurementList.push(obj);
            })
            response.send(modifiedProcurementList);
        }
        else
        {
            response.send([]);
        }
    })
    .catch((querryError)=>{
        console.log('QuerrError=>'+querryError.stack);
        response.send(querryError); 
    })


})
router.get('/getProcurementDetail',(request,response)=>{
    let procurementId=request.query.procurementId;
    console.log('getProcurementITDetail Id='+procurementId);
    let qry='SELECT proc.sfid,proc.Name as procName ,proc.Items__c ,proc.Products_Services_Name__c,vend.name as vendorName,proc.Product_Service__c,proc.Quantity__c, proc.Budget__c,proc.Impaneled_Vendor__c '+
    'FROM salesforce.Product_Line_Item__c proc '+
    'INNER JOIN salesforce.Impaneled_Vendor__c vend '+
    'ON proc.Impaneled_Vendor__c =  vend.sfid '+
    'WHERE proc.sfid=$1';
    pool
    .query(qry,[procurementId])
    .then((querryResult)=>{
    console.log('QuerryResult=>'+JSON.stringify(querryResult.rows));
    response.send(querryResult.rows);
})
.catch((querryError)=>{
    console.log('QuerrError '+querryError.stack);
    response.send(querryError);
})
})
router.post('/updateProcurement',(request,response)=>{
    let body = request.body;
    console.log('body  : '+JSON.stringify(body));
    const { specification, quantity,budget,hide} = request.body;
    console.log('specification of Item  '+specification);
    console.log('Procurement id  '+hide);
    console.log('budget  '+budget);
    let updateQuerry = 'UPDATE salesforce.Product_Line_Item__c SET '+
                         'product_service__c = \''+specification+'\', '+
                         'quantity__c = \''+quantity+'\', '+
                         'budget__c = \''+budget+'\' '+
                         'WHERE sfid = $1';
  console.log('updateQuerry  '+updateQuerry);
    pool
    .query(updateQuerry,[hide])
    .then((updateProcurementResult) => {     
             console.log('updateProcurementResult '+JSON.stringify(updateProcurementResult));
             response.send('Success');
    })
    .catch((updatetError) => {
         console.log('updatetError   '+updatetError.stack);
         response.send('Error');
    })
})

router.post('/updateProcurementIt',(request,response)=>{
    let body = request.body;
    console.log('body  : '+JSON.stringify(body));
    const { specification, quantity,budget,hide} = request.body;
    console.log('specification of Item  '+specification);
    console.log('Procurement id  '+hide);
    console.log('budget  '+budget);
    let updateQuerry = 'UPDATE salesforce.Product_Line_Item_IT__c SET '+
                         'product_service_specification__c = \''+specification+'\', '+
                         'quantity__c = \''+quantity+'\', '+
                         'budget__c = \''+budget+'\' '+
                         'WHERE sfid = $1';
  console.log('updateQuerry  '+updateQuerry);
    pool
    .query(updateQuerry,[hide])
    .then((updateProcurementITResult) => {     
             console.log('updateProcurementItResult =>>'+JSON.stringify(updateProcurementITResult));
             response.send('Success');
    })
    .catch((updatetError) => {
         console.log('updatetError'+updatetError.stack);
         response.send('Error');
    })
  })

router.get('/getVendorListView',verify,(request,response)=>{
    let objUser=request.user;
    console.log('user '+objUser);  
    response.render('VendorlistView',{objUser});

})

router.get('/getVendorsList',(request,response)=>{
    let qry ='select sfid ,name,vendor_Name__c ,services__c,items__c,GST_No__c,Bank_IFSC_Code__c ,Bank_Account_No__c,State__c,District__c '+
     'FROM salesforce.Impaneled_Vendor__c ';
     console.log('qry  =>'+qry)
     pool.query(qry)
     .then((vendorQueryResult) => {
         console.log('vendorQueryResult  : '+JSON.stringify(vendorQueryResult.rows));
         if(vendorQueryResult.rowCount>0){

            let modifiedList = [],i =1;
            vendorQueryResult.rows.forEach((eachRecord) => {
              let obj = {};
              obj.sequence = i;
              obj.name = '<a href="#" class="vendorTag" id="'+eachRecord.sfid+'" >'+eachRecord.name+'</a>';
              obj.vendorname=eachRecord.vendor_Name__c;
              obj.service = eachRecord.services__c;
              obj.item=eachRecord.items__c;
              obj.gst=eachRecord.gst_no__c;
              obj.acc=eachRecord.bank_account_no__c;
              obj.item_category = eachRecord.bank_IFSC_Code__c;
              obj.state = eachRecord.state__c;
              obj.district=eachRecord.district__c;
              obj.editAction = '<button href="#" class="btn btn-primary editVendor" id="'+eachRecord.sfid+'" >Edit</button>'
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
     .catch((error) => {
         console.log('error  : '+error.stack);
         response.send('Error Occurred !');
     })
})
router.get('/getVendorDetail',async(request,response)=>{
    let vendorId=request.query.vendorId;
    console.log('vendorId '+vendorId);
    
    let qry ='';
    console.log('qry Detail =>'+qry);
    let recordDeatil={};
    await
    pool
    .query('select sfid ,name,vendor_Name__c ,services__c,contact_no__c,name_of_signing_authority__c,bank_details__c,pan_no__c,address__c,items__c,GST_No__c,Bank_IFSC_Code__c ,Bank_Account_No__c,ownerid,Others__c,quote_public_url__c,State__c,District__c '+
    'FROM salesforce.Impaneled_Vendor__c where sfid=$1',[vendorId])
    .then((queryResult)=>{
        console.log('queryResult +>'+JSON.stringify(queryResult.rows));
        recordDeatil.VendorDetail=queryResult.rows;
        console.log('record '+recordDeatil);

        //response.send(queryResult.rows);
    })
    .catch((error)=>{
        console.log('error =>'+JSON.stringify(error.stack));
        response.send(error);
    })
await
pool
.query('select sfid ,name,Impaneled_Vendor__c,Unit__c,	Items__c,Per_Unit_Cost__c,Category__c '+
'FROM salesforce.Item_Description__c where impaneled_vendor__c=$1',[vendorId])
.then((itemdescriptionQueryy)=>{
    console.log('ten description =>'+JSON.stringify(itemdescriptionQueryy.rows));
    recordDeatil.item=itemdescriptionQueryy.rows;
})
.catch((error)=>{
    console.log('error '+error.stack);
    response.send(error);
})
console.log('reccord' +recordDeatil);
response.send(recordDeatil);
})
router.get('/createvendor',verify,(request,response)=>{
    let objUser=request.user;
    console.log('user '+objUser);
    response.render('createImpaneledVendor',{objUser});
})
router.get('/ItemDescription/:parentVendor',verify,(request,response)=>{
    let parentVendor = request.params.parentVendor;
    console.log('parentVendor '+parentVendor);
    let objUser=request.user;
    console.log('user '+objUser);
    response.render('ItemDescriptionForm',{parentVendor,objUser});

})
router.post('/saveItemDescription',(request,response)=>{
    let body = request.body;
    console.log('body  : '+JSON.stringify(body));
    const{name,items,category,unit,other,hide}=request.body;
    let record = [];
    record.push(name);
    record.push(items);
    record.push(category);
    record.push(unit);
    record.push(other);
    record.push(hide);
    let recordlist=[];
recordlist.push(record);
console.log(recordlist);

let itemDescQuery = format('INSERT INTO salesforce.Item_Description__c (name,Items__c, Category__c,Unit__c,Other_Items__c,Impaneled_Vendor__c ) VALUES %L returning id',recordlist);
console.log('impaneledVendor=>'+itemDescQuery);
pool
.query(itemDescQuery)
.then((querryResult)=>{
    console.log('QuerryResult'+JSON.stringify(querryResult));
    response.send('Succesfully Inserted');
})
.catch((error)=>{
    console.log(error.stack);
    response.send(error);
})
})
  router.post('/saveVendor',(request,response)=>{
    let body = request.body;
    console.log('body  : '+JSON.stringify(body));
    const{name,authority, cont,bankkDet,ifsc,pan,gst,add,accNo,state,url,other,district}=request.body;
    console.log(name+authority+cont+bankkDet+ifsc+pan+gst+add+accNo+state+url+other+district);

    
    let record = [];
    record.push(name);
    record.push(authority);
    record.push(cont);
    record.push(bankkDet);
    record.push(ifsc);
    record.push(pan);
    record.push(gst);
    record.push(add);
    record.push(accNo);
    record.push(state);
    record.push(district);
    record.push(url);
    record.push(other);

let recordlist=[];
recordlist.push(record);
console.log(recordlist);

       let impaneledVendor = format('INSERT INTO salesforce.Impaneled_Vendor__c (Vendor_Name__c,Name_of_Signing_Authority__c,Contact_No__c,Bank_Details__c,Bank_IFSC_Code__c, PAN_No__c,GST_No__c,Address__c,Bank_Account_No__c,State__c,District__c, Quote_Public_URL__c,Others__c ) VALUES %L returning id',recordlist);
       console.log('impaneledVendor=>'+impaneledVendor);
    pool.query(impaneledVendor)
    .then((vendorQueryResult) => {
        console.log('vendorQueryResult  : '+JSON.stringify(vendorQueryResult.rows));
        response.send('Saved Successfully !');
    })
    .catch((error) => {
        console.log('error  : '+error.stack);
        response.send('Error Occurred !');
    })
  

    })
router.get('/ItemDescriptionListView',verify,(request,response)=>{
    let objUser=request.user;
    console.log('user '+objUser);
    let vendorId = request.query.vendorId;
    console.log('vendor Id =>'+vendorId);
    response.render('ItemDescriptionListView',{objUser,vendorId});

})

router.get('/getItemList',(request,response)=>{
    let id=request.query.id;
    console.log('Idd '+id);
    let qry='select item.sfid ,item.name as itemName,item.items__c, item.category__c,item.per_unit_cost__c,item.unit__c,item.other_items__c,vend.name as vendername,item.impaneled_vendor__c '+
                'FROM salesforce.Item_Description__c item '+
                'INNER JOIN salesforce.Impaneled_Vendor__c vend '+
                'ON item.Impaneled_Vendor__c = vend.sfid '+
                'where item.impaneled_vendor__c=$1 AND item.sfid IS NOT null';
   console.log('qyer '+qry)
    pool
    .query(qry, [id])
    .then((querryResult)=>{
        console.log('QueryyResult '+JSON.stringify(querryResult.rows));
        if(querryResult.rowCount>0){

            let modifieldList = [],i =1;
            querryResult.rows.forEach((eachRecord) => {
                console.log('sfid '+eachRecord.sfid);
              let obj = {};
              obj.sequence = i;
              obj.name = '<a href="#" class="itemDetailTag" id="'+eachRecord.sfid+'" >'+eachRecord.itemname+'</a>';
              obj.category = eachRecord.category__c;
              obj.item = eachRecord.items__c;
              obj.unit = eachRecord.unit__c;
              obj.cost = eachRecord.per_unit_cost__c;
              obj.vendor=eachRecord.vendername;
              obj.editAction = '<button href="#" class="btn btn-primary editItem" id="'+eachRecord.sfid+'" >Edit</button>'
              i= i+1;
              modifieldList.push(obj);
            })
            response.send(modifieldList);
        }
        else
        response.send('[]');
    })
    .catch((error)=>{
        console.log('error '+error.stack);
        response.send(error);
    })
})
router.post('/updateVendor',(request,response)=>{
    let body = request.body;
    console.log('body  : '+JSON.stringify(body));
    const { name, state,district,aacc,auth,cont,bankDetail,ifsc,pan,add,gst,other,quote,hide} = request.body;
    console.log('state state state  '+state);
    console.log('Vendor id  '+hide);
    console.log('name  '+name);
    console.log('district  '+district);
    console.log('aacc  '+aacc);
    console.log('auth  '+auth);
    console.log('cont  '+cont);
    console.log('bankDetail  '+bankDetail);
    console.log('ifsc  '+ifsc);
    console.log('pan  '+pan);
    console.log('add  '+add);
    console.log('gst  '+gst);
    console.log('other'  +other);
    console.log('quote  '+quote);
    let updateQuerry = 'UPDATE salesforce.Impaneled_Vendor__c SET '+
                         'vendor_Name__c = \''+name+'\', '+
                         'District__c = \''+district+'\', '+
                         'State__c = \''+state+'\', '+
                         'Bank_Account_No__c = \''+aacc+'\', '+
                         'contact_no__c = \''+cont+'\', '+
                         'name_of_signing_authority__c = \''+auth+'\', '+
                         'name = \''+bankDetail+'\', '+
                         'Bank_IFSC_Code__c = \''+ifsc+'\', '+
                         'pan_no__c = \''+pan+'\', '+
                         'address__c = \''+add+'\', '+
                         'GST_No__c = \''+gst+'\', '+ 
                         'Others__c = \''+other+'\', '+ 
                         'quote_public_url__c = \''+quote+'\' '+                       
                         'WHERE sfid = $1';
  console.log('updateQuerry  '+updateQuerry);
    pool
    .query(updateQuerry,[hide])
    .then((updateQuerryResult) => {     
             console.log('updateQuerryResult =>>'+JSON.stringify(updateQuerryResult));
             response.send('Success');
    })
    .catch((updatetError) => {
         console.log('updatetError'+updatetError.stack);
         response.send('Error');
    })
})
router.get('/getItemDetail',(request,response)=>{
let itemId=request.query.itemId;
console.log('itemId '+itemId);
let qry='select item.sfid ,item.name as itemName,item.items__c, item.category__c,item.per_unit_cost__c,item.unit__c,item.other_items__c,vend.name as vendername,item.impaneled_vendor__c '+
                'FROM salesforce.Item_Description__c item '+
                'INNER JOIN salesforce.Impaneled_Vendor__c vend '+
                'ON item.Impaneled_Vendor__c = vend.sfid '+
                'where item.sfid=$1 ';
pool.query(qry,[itemId])
.then((itemdescriptionQueryy)=>{
console.log('Item description Detail=>'+JSON.stringify(itemdescriptionQueryy.rows));
response.send(itemdescriptionQueryy.rows);
})
.catch((error)=>{
    console.log('error '+error.stack);
    response.send(error);
})
})
router.post('/updateItemescription',(request,resposne)=>{
    let body = request.body;
    console.log('body  : '+JSON.stringify(body));
    const { item, cate,cost,unit,other,quote,hide} = request.body;
    console.log('item    '+item);
    console.log('cost  '+cost);
    console.log('cate  '+cate);
    console.log('unit  '+unit);
    console.log('other  '+other);
    console.log('Item ID  '+hide);
    let updateQuerry = 'UPDATE salesforce.Item_Description__c SET '+
    'category__c = \''+cate+'\', '+
    'items__c = \''+item+'\', '+
    'unit__c = \''+unit+'\', '+
    'per_unit_cost__c = \''+cost+'\', '+
    'Other_Items__c= \''+other+'\' '+
    'WHERE sfid = $1';
console.log('updateQuerry  '+updateQuerry);
pool
.query(updateQuerry,[hide])
.then((updateQuerryResult) => {     
console.log('updateQuerryResult =>>'+JSON.stringify(updateQuerryResult));
response.send('Success');
})
.catch((updatetError) => {
console.log('updatetError'+updatetError.stack);
response.send('Error');
})


})
module.exports = router;