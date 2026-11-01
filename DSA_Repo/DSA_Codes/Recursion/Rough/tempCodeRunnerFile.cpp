    while(cnt<m){
         reqele++;
         cnt+=n-(lower_bound(sortarr.begin(),sortarr.end(),reqele)-sortarr.begin());      
         cout<<cnt<<endl;
    }