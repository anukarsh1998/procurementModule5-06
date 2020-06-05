const pool = require('../db/dbConfig');
const verify = require('../config/verifyToken');
const format = require('pg-format');
const joi = require('@hapi/joi');
const Router = require('express-promise-router');
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

    await
    pool
    .query('SELECT id, sfid, Name, Project_Department__c, Approval_Status__c, Number_Of_IT_Product__c, Number_Of_Non_IT_Product__c, Procurement_IT_total_amount__c, Procurement_Non_IT_total_amount__c, Total_amount__c FROM  salesforce.Asset_Requisition_Form__c WHERE sfid = $1',[assetId])
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


router.get('/nonItProducts/:parentAssetId',verify, (request,response) => {

    let parentAssetId = request.params.parentAssetId;
    console.log('parentAssetId  '+parentAssetId);

    response.render('procurementNonIT',{name: request.user.name, email: request.user.email, parentAssetId : parentAssetId});
});


router.post('/nonItProducts', (request,response) => {

   let nonItFormResult = request.body;
   console.log('nonItFormResult  '+JSON.stringify(nonItFormResult));
   const{state,district,itemsCategory,items,itemSpecification,quantity,budget}=request.body;

   let numberOfRows,lstNonItProcurement = [];
   if(typeof(nonItFormResult.quantity) != 'object')
   {

        let schema=joi.object({
            state:joi.string().required().label('Please Choose State'),
            itemsCategory:joi.string().required().label('Choose itemsCategory & District If Your Choose UP Or UK'),
            items:joi.string().required().label('Choose your Item'),
            itemSpecification:joi.string().required().label('Fill your ITem Specification'),          
            quantity:joi.number().required().label('Enter your Quantity'),
            budget:joi.number().required().label('fill Your Budget '),

        })
        let result=schema.validate({state,items,itemsCategory,itemSpecification,quantity,budget});
        console.log('validation REsult '+JSON.stringify(result.error));
        if(result.error){
            console.log('fd'+result.error);
            response.send(result.error.details[0].context.label);
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
            singleRecordValues.push(nonItFormResult.justification);
            singleRecordValues.push(nonItFormResult.vendor);
            singleRecordValues.push(nonItFormResult.parentProcurementId);
            lstNonItProcurement.push(singleRecordValues);

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
            console.log('validation REsult '+JSON.stringify(result.error));
            if(result.error){
                console.log('Validation error'+result.error);
                response.send(result.error.details[0].context.label);
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
                singleRecordValues.push(nonItFormResult.vendor[i]);
                singleRecordValues.push(nonItFormResult.parentProcurementId[i]);
                lstNonItProcurement.push(singleRecordValues);
                console.log('dj'+singleRecordValues);
     
            }

       }
   }

   let nonItProductsInsertQuery = format('INSERT INTO salesforce.Product_Line_Item__c (Products_Services_Name__c, Items__c, Product_Service__c, Quantity__c, Budget__c, Quote1__c,Quote2__c	,Quote3__c,justification__c,Impaneled_Vendor__c, Asset_Requisition_Form__c ) VALUES %L returning id',lstNonItProcurement);

   pool.query(nonItProductsInsertQuery)
   .then((nonItProductsInsertQueryResult) => {
        console.log('nonItProductsInsertQueryResult  '+JSON.stringify(nonItProductsInsertQueryResult.rows));
        response.send('Saved Successfully');
   })
   .catch((nonItProductsInsertQueryError) => {
        console.log('nonItProductsInsertQueryError  '+nonItProductsInsertQueryError.stack);
        response.send('Error Occured !');
   })

   
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
            let singleItProductRecordValue = [];
            singleItProductRecordValue.push(itFormResult.items);
            singleItProductRecordValue.push(itFormResult.vendor);
            singleItProductRecordValue.push(itFormResult.itemSpecification);
            singleItProductRecordValue.push(itFormResult.quantity);
            singleItProductRecordValue.push(itFormResult.budget);
            singleItProductRecordValue.push(itFormResult.imgpath1);
            singleItProductRecordValue.push(itFormResult.imgpath2);
            singleItProductRecordValue.push(itFormResult.imgpath3);
            singleItProductRecordValue.push(itFormResult.parentProcurementId);
            lstItProducts.push(singleItProductRecordValue);
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

              let singleItProductRecordValue = [];
            singleItProductRecordValue.push(itFormResult.items[i]);
            singleItProductRecordValue.push(itFormResult.vendor[i]);
            singleItProductRecordValue.push(itFormResult.itemSpecification[i]);
            singleItProductRecordValue.push(itFormResult.quantity[i]);
            singleItProductRecordValue.push(itFormResult.budget[i]);
            singleItProductRecordValue.push(itFormResult.imgpath1[i]);
            singleItProductRecordValue.push(itFormResult.imgpath2[i]);
            singleItProductRecordValue.push(itFormResult.imgpath3[i]);
            singleItProductRecordValue.push(itFormResult.parentProcurementId[i]);
            lstItProducts.push(singleItProductRecordValue);
            }
        }
        console.log('lstProduct '+lstItProducts);
    }

    console.log('lstItProducts  '+JSON.stringify(lstItProducts));

    const itProductsInsertQuery = format('INSERT INTO salesforce.Product_Line_Item_IT__c (Items__c,Impaneled_Vendor__c,Product_Service_specification__c, Quantity__c, Budget__c,Quote1__c,Quote2__c,Quote3__c, Asset_Requisition_Form__c ) values %L returning id',lstItProducts);
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
router.get('/getCostandGSt',(request,response)=>{
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
     if(dstr=='' || dstr==null)
     {
         qry='SELECT sfid,vendor_name__c,GST_No__c,	Quote_Public_URL__c FROM salesforce.Impaneled_Vendor__c WHERE state__c = $1 AND items__c = $2';
         lst.push(st);
         lst.push(ite);
         console.log('qryyy '+qry+'lstItem '+lst);
     }
     else{
         qry='SELECT sfid,vendor_name__c,GST_No__c,Quote_Public_URL__c FROM salesforce.Impaneled_Vendor__c WHERE state__c = $1 AND District__c = $2 AND items__c = $3 ';
         lst=[st,dstr,ite];
         console.log('qry '+qry+'lst '+lst);
     }
     pool
     .query(qry,lst)
     .then((querryResult)=>{
         console.log('querryResult '+JSON.stringify(querryResult.rows));
         if(querryResult.rowCount>0)
         {
            response.send(querryResult.rows);
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
    .query('SELECT sfid,Per_Unit_Cost__c FROM salesforce.Item_Description__c where 	Impaneled_Vendor__c=$1',[sid])
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


module.exports = router;